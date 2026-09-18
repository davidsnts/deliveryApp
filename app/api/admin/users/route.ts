import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { initDb } from "@/app/lib/db";

// GET: Listar todos os usuários (sem expor a senha/hash)
export async function GET() {
  try {
    const db = await initDb();
    const result = await db.execute(
      "SELECT id, username, name, role, created_at FROM admin_users ORDER BY created_at DESC"
    );

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("Erro ao buscar usuários:", error);
    return NextResponse.json({ error: "Erro ao buscar usuários" }, { status: 500 });
  }
}

// POST: Criar novo usuário
export async function POST(request: Request) {
  try {
    const { username, password, name, role } = await request.json();

    if (!username || !password || !name) {
      return NextResponse.json({ error: "Campos obrigatórios ausentes" }, { status: 400 });
    }

    const db = await initDb();

    // Verifica se usuário já existe
    const existing = await db.execute({
      sql: "SELECT id FROM admin_users WHERE LOWER(username) = LOWER(?)",
      args: [username.trim()],
    });

    if (existing.rows.length > 0) {
      return NextResponse.json({ error: "Nome de usuário já cadastrado." }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const id = `user-${Date.now()}`;
    const createdAt = new Date().toISOString(); // <-- Data e hora atual em ISO

    await db.execute({
      sql: "INSERT INTO admin_users (id, username, password_hash, name, role, created_at) VALUES (?, ?, ?, ?, ?, ?)",
      args: [id, username.trim(), passwordHash, name.trim(), role || "admin", createdAt],
    });

    return NextResponse.json({ success: true, message: "Usuário criado com sucesso!" });
  } catch (error) {
    console.error("Erro ao criar usuário:", error);
    return NextResponse.json({ error: "Erro interno ao criar usuário" }, { status: 500 });
  }
}

// PUT: Atualizar Senha ou Dados do Usuário
export async function PUT(request: Request) {
  try {
    const { id, newPassword, name } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "ID do usuário é obrigatório." }, { status: 400 });
    }

    const db = await initDb();

    if (newPassword && newPassword.trim() !== "") {
      const passwordHash = await bcrypt.hash(newPassword, 10);
      await db.execute({
        sql: "UPDATE admin_users SET password_hash = ?, name = COALESCE(?, name) WHERE id = ?",
        args: [passwordHash, name?.trim() || null, id],
      });
    } else if (name) {
      await db.execute({
        sql: "UPDATE admin_users SET name = ? WHERE id = ?",
        args: [name.trim(), id],
      });
    }

    return NextResponse.json({ success: true, message: "Usuário atualizado com sucesso!" });
  } catch (error) {
    console.error("Erro ao atualizar usuário:", error);
    return NextResponse.json({ error: "Erro interno ao atualizar usuário" }, { status: 500 });
  }
}

// DELETE: Excluir Usuário
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID do usuário não informado." }, { status: 400 });
    }

    const db = await initDb();

    // Trava para evitar deletar o último usuário cadastrado
    const countResult = await db.execute("SELECT COUNT(*) as total FROM admin_users");
    const totalUsers = Number(countResult.rows[0].total);

    if (totalUsers <= 1) {
      return NextResponse.json(
        { error: "Não é possível excluir o único usuário do sistema." },
        { status: 400 }
      );
    }

    await db.execute({
      sql: "DELETE FROM admin_users WHERE id = ?",
      args: [id],
    });

    return NextResponse.json({ success: true, message: "Usuário excluído com sucesso!" });
  } catch (error) {
    console.error("Erro ao excluir usuário:", error);
    return NextResponse.json({ error: "Erro interno ao excluir usuário" }, { status: 500 });
  }
}