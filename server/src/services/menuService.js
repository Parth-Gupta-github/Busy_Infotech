const db = require('../db');

/**
 * Get all menu items
 * @param {boolean} includeArchived - If true, returns archived items as well
 */
async function getAllMenuItems(includeArchived = false) {
    let queryText = 'SELECT * FROM menu_items';
    if (!includeArchived) {
        queryText += ' WHERE archived = false';
    }
    queryText += ' ORDER BY name ASC';

    const result = await db.query(queryText);
    return result.rows;
}

/**
 * Get single menu item by ID
 */
async function getMenuItemById(id) {
    const result = await db.query('SELECT * FROM menu_items WHERE id = $1', [id]);
    if (result.rowCount === 0) {
        const error = new Error('Menu item not found.');
        error.status = 404;
        throw error;
    }
    return result.rows[0];
}

/**
 * Create a new menu item (Manager Only)
 */
async function createMenuItem({ name, price, available = true }) {
    if (!name || name.trim() === '') {
        const error = new Error('Menu item name is required.');
        error.status = 400;
        throw error;
    }

    const numPrice = parseFloat(price);
    if (isNaN(numPrice) || numPrice < 0) {
        const error = new Error('Price must be a valid non-negative number.');
        error.status = 400;
        throw error;
    }

    const result = await db.query(
        `INSERT INTO menu_items (name, price, available)
     VALUES ($1, $2, $3)
     RETURNING *`,
        [name.trim(), numPrice, available]
    );

    return result.rows[0];
}

/**
 * Update a menu item (Manager Only)
 */
async function updateMenuItem(id, { name, price, available }) {
    const currentItem = await getMenuItemById(id);

    const newName = name !== undefined ? name.trim() : currentItem.name;
    let newPrice = currentItem.price;

    if (price !== undefined) {
        const numPrice = parseFloat(price);
        if (isNaN(numPrice) || numPrice < 0) {
            const error = new Error('Price cannot be negative or invalid.');
            error.status = 400;
            throw error;
        }
        newPrice = numPrice;
    }

    const newAvailable = available !== undefined ? Boolean(available) : currentItem.available;

    const result = await db.query(
        `UPDATE menu_items
     SET name = $1, price = $2, available = $3, updated_at = NOW()
     WHERE id = $4
     RETURNING *`,
        [newName, newPrice, newAvailable, id]
    );

    return result.rows[0];
}

/**
 * Soft-delete (archive) or restore a menu item (Manager Only)
 */
async function setArchiveStatus(id, archived) {
    await getMenuItemById(id);

    const result = await db.query(
        `UPDATE menu_items
     SET archived = $1, updated_at = NOW()
     WHERE id = $2
     RETURNING *`,
        [archived, id]
    );

    return result.rows[0];
}

/**
 * Bulk Action — Apply price or availability changes to multiple items
 * Assignment Rule: Must report per item what succeeded and what failed with reasons!
 * @param {Array<{ id: string, price?: number, available?: boolean }>} updates
 */
async function bulkUpdateMenuItems(updates) {
    if (!Array.isArray(updates) || updates.length === 0) {
        const error = new Error('Updates array cannot be empty.');
        error.status = 400;
        throw error;
    }

    const results = [];

    for (const update of updates) {
        const { id, price, available } = update;

        try {
            if (!id) {
                results.push({ id: null, success: false, reason: 'Missing item ID.' });
                continue;
            }

            // Verify item exists
            const itemCheck = await db.query('SELECT * FROM menu_items WHERE id = $1', [id]);
            if (itemCheck.rowCount === 0) {
                results.push({ id, success: false, reason: 'Menu item not found.' });
                continue;
            }

            const item = itemCheck.rows[0];
            let newPrice = item.price;
            let newAvailable = item.available;

            // Validate price if provided
            if (price !== undefined) {
                const numPrice = parseFloat(price);
                if (isNaN(numPrice) || numPrice < 0) {
                    results.push({
                        id,
                        itemName: item.name,
                        success: false,
                        reason: `Rejected price ₹${price}: price cannot be negative.`
                    });
                    continue;
                }
                newPrice = numPrice;
            }

            if (available !== undefined) {
                newAvailable = Boolean(available);
            }

            // Execute update
            const updatedRes = await db.query(
                `UPDATE menu_items
         SET price = $1, available = $2, updated_at = NOW()
         WHERE id = $3
         RETURNING *`,
                [newPrice, newAvailable, id]
            );

            results.push({
                id,
                itemName: item.name,
                success: true,
                item: updatedRes.rows[0]
            });

        } catch (err) {
            results.push({
                id,
                success: false,
                reason: err.message || 'Database update failed.'
            });
        }
    }

    return results;
}

module.exports = {
    getAllMenuItems,
    getMenuItemById,
    createMenuItem,
    updateMenuItem,
    setArchiveStatus,
    bulkUpdateMenuItems
};
