"""
AuthSys - Login & Registration System
Backend: Python (Flask) + MySQL

Corrections made vs. the original single-file version:
  1. Real MySQL persistence instead of browser localStorage
     (localStorage is client-only, not shared, easily cleared/edited by the user).
  2. Passwords are hashed with werkzeug.security instead of stored as plain text.
  3. Duplicate username/email checks are done server-side against the database.
  4. All SQL queries use parameterized statements (prevents SQL injection).
  5. Login sessions are managed with Flask's server-side signed session cookie
     instead of a JSON blob in localStorage (which anyone could edit to fake a login).
  6. DB credentials are read from environment variables, not hardcoded.
"""

import os
from datetime import datetime

from flask import Flask, render_template, request, jsonify, session
from werkzeug.security import generate_password_hash, check_password_hash
import mysql.connector
from mysql.connector import errorcode

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "dev-secret-change-me")

DB_CONFIG = {
    "host": os.environ.get("DB_HOST", "localhost"),
    "user": os.environ.get("DB_USER", "root"),
    "password": os.environ.get("DB_PASSWORD", ""),
    "database": os.environ.get("DB_NAME", "authsys_db"),
}


def get_db_connection():
    return mysql.connector.connect(**DB_CONFIG)


# ---------- Page routes (serve the SPA) ----------

@app.route("/")
def index():
    return render_template("index.html")


# ---------- API routes ----------

@app.route("/api/register", methods=["POST"])
def api_register():
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip()
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""

    if not all([name, email, username, password]):
        return jsonify({"ok": False, "message": "Please fill in all fields!"}), 400
    if len(password) < 6:
        return jsonify({"ok": False, "message": "Password must be at least 6 characters!"}), 400

    conn = get_db_connection()
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute("SELECT id FROM users WHERE username = %s", (username,))
        if cur.fetchone():
            return jsonify({"ok": False, "message": "Username already taken!"}), 409

        cur.execute("SELECT id FROM users WHERE email = %s", (email,))
        if cur.fetchone():
            return jsonify({"ok": False, "message": "Email already registered!"}), 409

        password_hash = generate_password_hash(password)
        cur.execute(
            "INSERT INTO users (name, email, username, password_hash) VALUES (%s, %s, %s, %s)",
            (name, email, username, password_hash),
        )
        conn.commit()
        user_id = cur.lastrowid

        session["user_id"] = user_id
        session["name"] = name
        session["email"] = email

        return jsonify({"ok": True, "message": f"Account created! Welcome, {name}!",
                         "user": {"name": name, "email": email}})
    finally:
        cur.close()
        conn.close()


@app.route("/api/login", methods=["POST"])
def api_login():
    data = request.get_json(silent=True) or {}
    identifier = (data.get("identifier") or "").strip()  # username or email
    password = data.get("password") or ""

    if not identifier or not password:
        return jsonify({"ok": False, "message": "Please fill in all fields!"}), 400

    conn = get_db_connection()
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute(
            "SELECT * FROM users WHERE username = %s OR email = %s",
            (identifier, identifier),
        )
        user = cur.fetchone()

        if not user or not check_password_hash(user["password_hash"], password):
            return jsonify({"ok": False, "message": "Account not found. Please create an account."}), 401

        cur.execute(
            "UPDATE users SET last_login = %s WHERE id = %s",
            (datetime.now(), user["id"]),
        )
        conn.commit()

        session["user_id"] = user["id"]
        session["name"] = user["name"]
        session["email"] = user["email"]

        return jsonify({"ok": True, "message": f"Welcome back, {user['name']}!",
                         "user": {"name": user["name"], "email": user["email"]}})
    finally:
        cur.close()
        conn.close()


@app.route("/api/logout", methods=["POST"])
def api_logout():
    session.clear()
    return jsonify({"ok": True, "message": "Logged out. See you soon!"})


@app.route("/api/session", methods=["GET"])
def api_session():
    if "user_id" in session:
        return jsonify({"ok": True, "user": {"name": session["name"], "email": session["email"]}})
    return jsonify({"ok": False, "user": None})


if __name__ == "__main__":
    app.run(debug=True)
