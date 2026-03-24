import bcrypt from 'bcrypt';
import { writePool, readPool } from '../db.js';

export async function createUser(data) {
    const hashedPassword = await bcrypt.hash(data.password, 10);
    try {
        const { rows } = await writePool.query(
            `INSERT INTO users (firstname, lastname, email, phone, role, password)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id, firstname, lastname, email, phone, role, created_at AS "createdAt"`,
            [data.firstname, data.lastname, data.email, data.phone || null, data.role || 'customer', hashedPassword]
        );
        return rows[0];
    } catch (err) {
        if (err.code === '23505') {
            throw { status: 409, message: "Cet email est déjà utilisé" };
        }
        throw err;
    }
}

export async function getAllUsers(role) {
    const { rows } = role
        ? await readPool.query(
            `SELECT id, firstname, lastname, email, phone, role, created_at AS "createdAt" FROM users WHERE role = $1`,
            [role]
          )
        : await readPool.query(
            `SELECT id, firstname, lastname, email, phone, role, created_at AS "createdAt" FROM users`
          );
    return rows;
}

export async function getUserById(id) {
    const { rows } = await readPool.query(
        `SELECT id, firstname, lastname, email, phone, role, created_at AS "createdAt" FROM users WHERE id = $1`,
        [id]
    );
    if (!rows[0]) throw { status: 404, message: "Utilisateur non trouvé" };
    return rows[0];
}

export async function updateUser(id, data) {
    if (data.password) {
        data.password = await bcrypt.hash(data.password, 10);
    }
    try {
        const { rows } = await writePool.query(
            `UPDATE users SET
                firstname = COALESCE($1, firstname),
                lastname  = COALESCE($2, lastname),
                email     = COALESCE($3, email),
                phone     = COALESCE($4, phone),
                password  = COALESCE($5, password)
             WHERE id = $6
             RETURNING id, firstname, lastname, email, phone, role, created_at AS "createdAt"`,
            [data.firstname, data.lastname, data.email, data.phone, data.password, id]
        );
        if (!rows[0]) throw { status: 404, message: "Utilisateur non trouvé" };
        return rows[0];
    } catch (err) {
        if (err.code === '23505') {
            throw { status: 409, message: "Cet email est déjà utilisé" };
        }
        throw err;
    }
}

export async function deleteUser(id) {
    const { rowCount } = await writePool.query(`DELETE FROM users WHERE id = $1`, [id]);
    if (rowCount === 0) throw { status: 404, message: "Utilisateur non trouvé" };
}
