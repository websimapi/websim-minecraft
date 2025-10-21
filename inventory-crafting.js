import { blockTypeImages } from './inventory-state.js';

export class CraftingSystem {
    constructor(inventoryState) {
        this.state = inventoryState;
        this.craftingSlots = Array(9).fill(null).map(() => ({ type: null, count: 0 }));
        this.craftingOutput = { type: null, count: 0 };
        this.personalCraftingSlots = Array(4).fill(null).map(() => ({ type: null, count: 0 }));
        this.personalCraftingOutput = { type: null, count: 0 };
    }

    checkRecipe(slots, is3x3 = true) {
        if (is3x3) {
            return this.check3x3Recipe(slots);
        } else {
            return this.check2x2Recipe(slots);
        }
    }

    check2x2Recipe(slots) {
        const ingredients = new Map();
        let shapelessGrid = [];
        for (let i = 0; i < 4; i++) {
            if (slots[i].type !== null) {
                ingredients.set(slots[i].type, (ingredients.get(slots[i].type) || 0) + 1);
                shapelessGrid.push(slots[i].type);
            }
        }
        const consumes = (type, amount) => {
            const result = [];
            let remaining = amount;
            for (let i = 0; i < 4; i++) {
                if (slots[i].type === type) {
                    result.push({ slot: i, amount: 1 });
                    remaining--;
                    if (remaining === 0) break;
                }
            }
            return result;
        };

        // 1 log -> 4 planks (shapeless)
        if (ingredients.size === 1 && ingredients.has(5) && shapelessGrid.length === 1) {
            return { output: 10, count: 4, consumes: consumes(5, 1) };
        }

        // 2 planks -> 4 sticks (vertical)
        if (ingredients.size === 1 && ingredients.has(10) && ingredients.get(10) === 2) {
             // Check vertical patterns
            if ((slots[0].type === 10 && slots[2].type === 10 && slots[1].type === null && slots[3].type === null)) {
                return { output: 42, count: 4, consumes: [{ slot: 0, amount: 1 }, { slot: 2, amount: 1 }] };
            }
            if ((slots[1].type === 10 && slots[3].type === 10 && slots[0].type === null && slots[2].type === null)) {
                return { output: 42, count: 4, consumes: [{ slot: 1, amount: 1 }, { slot: 3, amount: 1 }] };
            }
        }

        // 4 planks -> 1 crafting table (2x2 square)
        if (ingredients.size === 1 && ingredients.has(10) && ingredients.get(10) === 4) {
             if (slots[0].type === 10 && slots[1].type === 10 && slots[2].type === 10 && slots[3].type === 10) {
                return { output: 20, count: 1, consumes: [{slot: 0, amount: 1}, {slot: 1, amount: 1}, {slot: 2, amount: 1}, {slot: 3, amount: 1}] };
            }
        }
        return null;
    }

    check3x3Recipe(slots) {
        const ingredients = new Map();
        let shapelessGrid = [];
        for (let i = 0; i < 9; i++) {
            if (slots[i].type !== null) {
                ingredients.set(slots[i].type, (ingredients.get(slots[i].type) || 0) + 1);
                shapelessGrid.push(slots[i].type);
            }
        }
        const consumes = (type, amount) => {
            const result = [];
            let remaining = amount;
            for (let i = 0; i < 9; i++) {
                if (slots[i].type === type) {
                    result.push({ slot: i, amount: 1 });
                    remaining--;
                    if (remaining === 0) break;
                }
            }
            return result;
        };

        // Furnace recipe: 8 cobblestone in a square with empty center
        let furnacePattern = true;
        const furnaceSlots = [0, 1, 2, 3, 5, 6, 7, 8]; // All except center
        for (const i of furnaceSlots) {
            if (slots[i].type !== 3) { // Cobblestone
                furnacePattern = false;
                break;
            }
        }
        if (furnacePattern && slots[4].type === null) {
            return {
                output: 44,
                count: 1,
                consumes: furnaceSlots.map(i => ({ slot: i, amount: 1 }))
            };
        }

        // 2 planks -> 4 sticks
        if (ingredients.size === 1 && ingredients.has(10) && ingredients.get(10) === 2) {
            // Check for vertical pattern
            for (let col = 0; col < 3; col++) {
                if (slots[col].type === 10 && slots[col + 3].type === 10) {
                    let othersEmpty = true;
                    for (let j = 0; j < 9; j++) {
                        if (j !== col && j !== col + 3 && slots[j].type !== null) {
                            othersEmpty = false;
                            break;
                        }
                    }
                    if (othersEmpty) {
                        return { output: 42, count: 4, consumes: [{ slot: col, amount: 1 }, { slot: col + 3, amount: 1 }] };
                    }
                }
            }
        }

        // Pickaxe recipes (3 material + 2 sticks)
        const pickaxePatterns = [
            [0, 1, 2, 4, 7], // Top row + middle column
            [3, 4, 5, 1, 7], // Middle row + top-middle column
        ];
        
        for (const pattern of pickaxePatterns) {
            const [m1, m2, m3, s1, s2] = pattern;
            if (slots[s1].type === 42 && slots[s2].type === 42) {
                const materialType = slots[m1].type;
                if (materialType !== null && slots[m2].type === materialType && slots[m3].type === materialType) {
                    let outputTool = null;
                    if (materialType === 10) outputTool = 33; // Wooden pickaxe
                    else if (materialType === 3) outputTool = 34; // Stone pickaxe
                    else if (materialType === 43) outputTool = 35; // Iron pickaxe
                    
                    if (outputTool !== null) {
                        // Check other slots are empty
                        let valid = true;
                        for (let i = 0; i < 9; i++) {
                            if (![m1, m2, m3, s1, s2].includes(i) && slots[i].type !== null) {
                                valid = false;
                                break;
                            }
                        }
                        if (valid) {
                            return {
                                output: outputTool,
                                count: 1,
                                durability: this.getToolDurability(outputTool),
                                consumes: [
                                    { slot: m1, amount: 1 },
                                    { slot: m2, amount: 1 },
                                    { slot: m3, amount: 1 },
                                    { slot: s1, amount: 1 },
                                    { slot: s2, amount: 1 }
                                ]
                            };
                        }
                    }
                }
            }
        }

        // Axe recipes (3 material + 2 sticks)
        const axePatterns = [
            [0, 1, 3, 4, 7], // Top-left corner
            [1, 2, 4, 5, 7], // Top-right corner
        ];
        
        for (const pattern of axePatterns) {
            const [m1, m2, m3, s1, s2] = pattern;
            if (slots[s1].type === 42 && slots[s2].type === 42) {
                const materialType = slots[m1].type;
                if (materialType !== null && slots[m2].type === materialType && slots[m3].type === materialType) {
                    let outputTool = null;
                    if (materialType === 10) outputTool = 36; // Wooden axe
                    else if (materialType === 3) outputTool = 37; // Stone axe
                    else if (materialType === 43) outputTool = 38; // Iron axe
                    
                    if (outputTool !== null) {
                        let valid = true;
                        for (let i = 0; i < 9; i++) {
                            if (![m1, m2, m3, s1, s2].includes(i) && slots[i].type !== null) {
                                valid = false;
                                break;
                            }
                        }
                        if (valid) {
                            return {
                                output: outputTool,
                                count: 1,
                                durability: this.getToolDurability(outputTool),
                                consumes: [
                                    { slot: m1, amount: 1 },
                                    { slot: m2, amount: 1 },
                                    { slot: m3, amount: 1 },
                                    { slot: s1, amount: 1 },
                                    { slot: s2, amount: 1 }
                                ]
                            };
                        }
                    }
                }
            }
        }

        // Shovel recipes (1 material + 2 sticks)
        for (let col = 0; col < 3; col++) {
            const m = col;
            const s1 = col + 3;
            const s2 = col + 6;
            
            if (slots[s1].type === 42 && slots[s2].type === 42) {
                const materialType = slots[m].type;
                if (materialType !== null) {
                    let outputTool = null;
                    if (materialType === 10) outputTool = 39; // Wooden shovel
                    else if (materialType === 3) outputTool = 40; // Stone shovel
                    else if (materialType === 43) outputTool = 41; // Iron shovel
                    
                    if (outputTool !== null) {
                        let valid = true;
                        for (let i = 0; i < 9; i++) {
                            if (![m, s1, s2].includes(i) && slots[i].type !== null) {
                                valid = false;
                                break;
                            }
                        }
                        if (valid) {
                            return {
                                output: outputTool,
                                count: 1,
                                durability: this.getToolDurability(outputTool),
                                consumes: [
                                    { slot: m, amount: 1 },
                                    { slot: s1, amount: 1 },
                                    { slot: s2, amount: 1 }
                                ]
                            };
                        }
                    }
                }
            }
        }

        // 1 log -> 4 planks (shapeless)
        if (ingredients.size === 1 && ingredients.has(5) && shapelessGrid.length === 1) {
             return { output: 10, count: 4, consumes: consumes(5, 1) };
        }

        // 4 planks -> 1 crafting table (shapeless 2x2 pattern)
        if (ingredients.size === 1 && ingredients.has(10) && ingredients.get(10) === 4) {
            // Check for a 2x2 square pattern anywhere
            for (let row = 0; row < 2; row++) {
                for (let col = 0; col < 2; col++) {
                    const i = row * 3 + col;
                    if (slots[i].type === 10 && slots[i+1].type === 10 && slots[i+3].type === 10 && slots[i+4].type === 10) {
                        // Check if other slots are empty
                        let othersEmpty = true;
                        for(let j=0; j<9; j++) {
                            if (![i, i+1, i+3, i+4].includes(j) && slots[j].type !== null) {
                                othersEmpty = false;
                                break;
                            }
                        }
                        if (othersEmpty) {
                             return {
                                output: 20,
                                count: 1,
                                consumes: [
                                    { slot: i, amount: 1 },
                                    { slot: i + 1, amount: 1 },
                                    { slot: i + 3, amount: 1 },
                                    { slot: i + 4, amount: 1 }
                                ]
                            };
                        }
                    }
                }
            }
        }

        // Horizontal line recipes for slabs (3 items in a row)
        const rows = [[0, 1, 2], [3, 4, 5], [6, 7, 8]];

        for (const row of rows) {
            const slot0 = slots[row[0]];
            const slot1 = slots[row[1]];
            const slot2 = slots[row[2]];

            if (slot0.type !== null && slot0.type === slot1.type && slot1.type === slot2.type &&
                slot0.count >= 1 && slot1.count >= 1 && slot2.count >= 1) {

                let othersFilled = false;
                for (let i = 0; i < 9; i++) {
                    if (!row.includes(i) && slots[i].count > 0) {
                        othersFilled = true;
                        break;
                    }
                }

                if (!othersFilled) {
                    let outputType = null;
                    if (slot0.type === 3) outputType = 11; // Cobblestone -> Stone Slab
                    else if (slot0.type === 5) outputType = 12;
                    else if (slot0.type === 10) outputType = 13;

                    if (outputType !== null) {
                        return {
                            output: outputType,
                            count: 6,
                            consumes: [
                                { slot: row[0], amount: 1 },
                                { slot: row[1], amount: 1 },
                                { slot: row[2], amount: 1 }
                            ]
                        };
                    }
                }
            }
        }

        return null;
    }

    getToolDurability(toolType) {
        const durabilities = {
            33: 59, // Wooden pickaxe
            34: 131, // Stone pickaxe
            35: 250, // Iron pickaxe
            36: 59, // Wooden axe
            37: 131, // Stone axe
            38: 250, // Iron axe
            39: 59, // Wooden shovel
            40: 131, // Stone shovel
            41: 250, // Iron shovel
        };
        return durabilities[toolType] || null;
    }

    updateCraftingOutput(is3x3 = true) {
        const slots = is3x3 ? this.craftingSlots : this.personalCraftingSlots;
        const recipe = this.checkRecipe(slots, is3x3);

        if (is3x3) {
            if (recipe) {
                this.craftingOutput.type = recipe.output;
                this.craftingOutput.count = recipe.count;
                this.craftingOutput.durability = recipe.durability || null;
            } else {
                this.craftingOutput.type = null;
                this.craftingOutput.count = 0;
                this.craftingOutput.durability = null;
            }
        } else {
            if (recipe) {
                this.personalCraftingOutput.type = recipe.output;
                this.personalCraftingOutput.count = recipe.count;
                this.personalCraftingOutput.durability = recipe.durability || null;
            } else {
                this.personalCraftingOutput.type = null;
                this.personalCraftingOutput.count = 0;
                this.personalCraftingOutput.durability = null;
            }
        }
    }

    consumeRecipe(is3x3 = true) {
        const slots = is3x3 ? this.craftingSlots : this.personalCraftingSlots;
        const recipe = this.checkRecipe(slots, is3x3);
        if (!recipe) return false;

        for (const consume of recipe.consumes) {
            slots[consume.slot].count -= consume.amount;
            if (slots[consume.slot].count === 0) {
                slots[consume.slot].type = null;
            }
        }

        this.updateCraftingOutput(is3x3);
        return true;
    }

    canCraft(is3x3 = true) {
        const recipe = this.checkRecipe(is3x3 ? this.craftingSlots : this.personalCraftingSlots, is3x3);
        return recipe !== null;
    }

    autoCraftAll(is3x3 = true) {
        const output = is3x3 ? this.craftingOutput : this.personalCraftingOutput;
        if (output.type === null || output.count === 0) return 0;

        let totalCrafted = 0;
        while (this.canCraft(is3x3)) {
            if (this.consumeRecipe(is3x3)) {
                totalCrafted += output.count;
            } else {
                break;
            }
        }

        return totalCrafted;
    }

    returnCraftingItems(is3x3 = true) {
        const slots = is3x3 ? this.craftingSlots : this.personalCraftingSlots;
        const items = [];

        for (let i = 0; i < slots.length; i++) {
            const slot = slots[i];
            if (slot.type !== null && slot.count > 0) {
                items.push({ type: slot.type, count: slot.count });
                slot.type = null;
                slot.count = 0;
            }
        }

        return items;
    }
}