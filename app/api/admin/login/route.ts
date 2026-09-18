import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { initDb } from "@/app/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: "Usuário e senha são obrigatórios." },
        { status: 400 }
      );
    }

    // Inicializa/Garante acesso ao banco no Turso
    const db = await initDb();

    // Busca usuário pelo username (case-insensitive)
    const result = await db.execute({
      sql: "SELECT * FROM admin_users WHERE LOWER(username) = LOWER(?)",
      args: [username.trim()],
    });

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Usuário ou senha incorretos." },
        { status: 401 }
      );
    }

    const user = result.rows[0];
    const passwordHash = user.password_hash as string;

    // Compara a senha enviada pelo formulário com o Hash salvo no Turso
    const isPasswordValid = await bcrypt.compare(password, passwordHash);

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Usuário ou senha incorretos." },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Erro no login:", error);
    return NextResponse.json(
      { error: "Erro interno no servidor ao realizar login." },
      { status: 500 }
    );
  }
}