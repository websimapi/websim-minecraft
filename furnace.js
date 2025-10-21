import { fuelSources, BlockType } from './blocks.js';

const smeltingRecipes = {
    [BlockType.IRON_ORE]: { output: BlockType.IRON_INGOT, cookTime: 10 },
    [BlockType.COAL_ORE]: { output: BlockType.COAL, cookTime: 10 }
};

export class Furnace {
    constructor(inventoryState, renderer, world) {
        this.state = inventoryState;
        this.renderer = renderer;
        this.world = world;
        this.slotHandler = null;
        this.activeFurnaceCoords = null;
        this.furnaces = new Map();
        this.furnaceDataTemplate = {
            inputSlot: { type: null, count: 0, durability: null },
            fuelSlot: { type: null, count: 0, durability: null },
            outputSlot: { type: null, count: 0, durability: null },
            burnTime: 0, maxBurnTime: 0, cookTime: 0, maxCookTime: 0
        };
    }

    setSlotHandler(h) { this.slotHandler = h; }

    getFurnaceData(c) {
        const k = `${c.x},${c.y},${c.z}`;
        if (!this.furnaces.has(k)) this.furnaces.set(k, JSON.parse(JSON.stringify(this.furnaceDataTemplate)));
        return this.furnaces.get(k);
    }
    
    getActiveFurnaceData() { return this.activeFurnaceCoords ? this.getFurnaceData(this.activeFurnaceCoords) : null; }

    setupFurnaceUI() {
        const h = this.slotHandler.handleSlotMouseDown.bind(this.slotHandler);
        const u = this.slotHandler.handleSlotMouseUp.bind(this.slotHandler);
        const o = this.slotHandler.handleSlotHover.bind(this.slotHandler);
        const r = e => e.currentTarget.classList.remove('drag-over');
        
        ['furnace-input-slot', 'furnace-fuel-slot', 'furnace-output-slot'].forEach((id, i) => {
            const s = document.getElementById(id);
            const t = ['furnace_input', 'furnace_fuel', 'furnace_output'][i];
            const isOut = i === 2;
            s.addEventListener('mousedown', e => h(e, 0, t, false, false, isOut));
            s.addEventListener('mouseup', e => u(e, 0, t, false, false, isOut));
            if (!isOut) {
                s.addEventListener('mouseover', e => o(e, 0, t, false, false));
                s.addEventListener('mouseleave', r);
            }
        });

        const g = document.getElementById('furnace-inventory-grid');
        const b = document.getElementById('furnace-inventory-hotbar');

        for (let i = 0; i < 27; i++) {
            const s = document.createElement('div');
            s.className = 'inventory-slot';
            const id = i + 9;
            s.dataset.slot = id;
            s.dataset.type = 'inventory';
            const c = document.createElement('div');
            c.className = 'slot-content';
            s.appendChild(c);
            const n = document.createElement('span');
            n.className = 'slot-count';
            s.appendChild(n);
            s.addEventListener('mousedown', e => h(e, id, 'inventory', false, false, false));
            s.addEventListener('mouseup', e => u(e, id, 'inventory', false, false, false));
            s.addEventListener('mouseover', e => o(e, id, 'inventory', false, false));
            s.addEventListener('mouseleave', r);
            g.appendChild(s);
        }

        for (let i = 0; i < 9; i++) {
            const s = document.createElement('div');
            s.className = 'inventory-slot hotbar-inventory-slot';
            s.dataset.slot = i;
            s.dataset.type = 'hotbar';
            const c = document.createElement('div');
            c.className = 'slot-content';
            s.appendChild(c);
            const n = document.createElement('span');
            n.className = 'slot-count';
            s.appendChild(n);
            const m = document.createElement('span');
            m.className = 'slot-number';
            m.textContent = i + 1;
            s.appendChild(m);
            s.addEventListener('mousedown', e => h(e, i, 'hotbar', false, false, false));
            s.addEventListener('mouseup', e => u(e, i, 'hotbar', false, false, false));
            s.addEventListener('mouseover', e => o(e, i, 'hotbar', false, false));
            s.addEventListener('mouseleave', r);
            b.appendChild(s);
        }
    }

    open(c) {
        this.activeFurnaceCoords = c;
        document.getElementById('furnace-screen').classList.remove('hidden');
        document.exitPointerLock();
        this.render();
    }

    close() {
        document.getElementById('furnace-screen').classList.add('hidden');
        this.activeFurnaceCoords = null;
        if (this.state.heldItem) this.state.returnHeldItemToInventory();
    }

    returnItems(f = this.getActiveFurnaceData()) {
        if (!f) return;
        [f.inputSlot, f.fuelSlot, f.outputSlot].forEach(s => {
            if (s.type !== null && s.count > 0) {
                this.state.addItemsToInventory({ type: s.type, count: s.count, durability: s.durability });
                s.type = null; s.count = 0; s.durability = null;
            }
        });
    }

    render() {
        const f = this.getActiveFurnaceData();
        if (!f) return;
        this.renderer.renderSlot(document.getElementById('furnace-input-slot'), f.inputSlot);
        this.renderer.renderSlot(document.getElementById('furnace-fuel-slot'), f.fuelSlot);
        this.renderer.renderSlot(document.getElementById('furnace-output-slot'), f.outputSlot);

        const fi = document.querySelector('.flame-icon');
        fi.style.clipPath = f.burnTime > 0 && f.maxBurnTime > 0 ? `inset(${(1 - f.burnTime / f.maxBurnTime) * 100}% 0 0 0)` : 'inset(100% 0 0 0)';

        const p = document.querySelector('.furnace-progress');
        p.style.clipPath = f.cookTime > 0 && f.maxCookTime > 0 ? `inset(0 ${100 - (f.cookTime / f.maxCookTime) * 100}% 0 0)` : 'inset(0 100% 0 0)';

        const g = document.getElementById('furnace-inventory-grid').querySelectorAll('.inventory-slot');
        g.forEach((s, i) => this.renderer.renderSlot(s, this.state.inventorySlots[i]));

        const h = document.getElementById('furnace-inventory-hotbar').querySelectorAll('.inventory-slot');
        h.forEach((s, i) => {
            this.renderer.renderSlot(s, this.state.slots[i]);
            s.classList[i === this.state.selectedSlot ? 'add' : 'remove']('selected');
        });
    }

    update(d) {
        for (const [k, f] of this.furnaces) this.updateSingleFurnace(f, d);
        if (this.isScreenOpen()) this.render();
    }

    updateSingleFurnace(f, d) {
        const inp = f.inputSlot, fuel = f.fuelSlot, out = f.outputSlot;
        const r = smeltingRecipes[inp.type];
        const wasBurn = f.burnTime > 0;
        let isBurn = wasBurn, canSmelt = false;

        if (r) {
            f.maxCookTime = r.cookTime;
            if (inp.count > 0 && (out.type === null || (out.type === r.output && out.count < 64))) canSmelt = true;
        } else {
            f.maxCookTime = 0;
            f.cookTime = 0;
        }

        if (isBurn) {
            f.burnTime = Math.max(0, f.burnTime - d);
        } else if (canSmelt && fuel.type !== null) {
            const fd = fuelSources[fuel.type];
            if (fd > 0) {
                f.maxBurnTime = fd;
                f.burnTime = fd;
                fuel.count--;
                if (fuel.count <= 0) fuel.type = null;
                isBurn = true;
            }
        }

        if (canSmelt && isBurn) {
            f.cookTime += d;
            if (f.cookTime >= f.maxCookTime) {
                f.cookTime = 0;
                inp.count--;
                if (inp.count <= 0) inp.type = null;
                if (out.type === null) {
                    out.type = r.output;
                    out.count = 1;
                } else out.count++;
            }
        } else if (f.cookTime > 0) f.cookTime = Math.max(0, f.cookTime - d * 2);

        if (isBurn !== wasBurn && this.world) this.updateWorldBlockState(f, isBurn);
    }

    updateWorldBlockState(f, isBurn) {
        let c = null;
        for (const [k, d] of this.furnaces) {
            if (d === f) {
                const [x, y, z] = k.split(',').map(Number);
                c = { x, y, z };
                break;
            }
        }
        if (c) this.world.setBlockAt(c.x, c.y, c.z, isBurn ? BlockType.FURNACE_LIT : BlockType.FURNACE);
    }

    removeFurnaceState(c) {
        const k = `${c.x},${c.y},${c.z}`;
        if (this.activeFurnaceCoords && this.activeFurnaceCoords.x === c.x && this.activeFurnaceCoords.y === c.y && this.activeFurnaceCoords.z === c.z) {
            const f = this.getActiveFurnaceData();
            if (f) this.returnItems(f);
            this.close();
        } else if (this.furnaces.has(k)) this.returnItems(this.furnaces.get(k));
        this.furnaces.delete(k);
    }

    isScreenOpen() { return !document.getElementById('furnace-screen').classList.contains('hidden'); }
}