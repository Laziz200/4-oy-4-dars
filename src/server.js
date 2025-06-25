import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";

const server = http.createServer(async (req, res) => {
  const url = req.url;
  const method = req.method;
  const usersFilePath = path.join(process.cwd(), "db", "users.json");
  const todosFilePath = path.join(process.cwd(), "db", "todos.json");

  async function readUsers() {
    try {
      const data = await fs.readFile(usersFilePath, "utf8");
      return JSON.parse(data);
    } catch (error) {
      console.error("users.json o'qishda xato:", error);
      return [];
    }
  }

  async function writeUsers(users) {
    try {
      await fs.writeFile(usersFilePath, JSON.stringify(users, null, 2));
    } catch (error) {
      console.error("users.json ga yozishda xato:", error);
    }
  }

  async function readTodos() {
    try {
      const data = await fs.readFile(todosFilePath, "utf8");
      return JSON.parse(data);
    } catch (error) {
      console.error("todos.json o'qishda xato:", error);
      return [];
    }
  }

  async function writeTodos(todos) {
    try {
      await fs.writeFile(todosFilePath, JSON.stringify(todos, null, 2));
    } catch (error) {
      console.error("todos.json ga yozishda xato:", error);
    }
  }

  if (url === "/" && method === "GET") {
    const users = await readUsers();
    const todos = await readTodos();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ users, todos }));
  }
  else if (url === "/api/users" && method === "POST") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });
    req.on("end", async () => {
      try {
        const { name } = JSON.parse(body);
        if (!name) {
          res.writeHead(400, { "Content-Type": "application/json" });
          return res.end(
            JSON.stringify({ error: "Ism kiritish shart" })
          );
        }

        const users = await readUsers();
        const newUser = {
          id: users.length ? users[users.length - 1].id + 1 : 1,
          name,
        };

        users.push(newUser);
        await writeUsers(users);

        res.writeHead(201, { "Content-Type": "application/json" });
        res.end(JSON.stringify(newUser));
      } catch (error) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Noto'g'ri JSON formati" }));
      }
    });
  }
  else if (url === "/api/todos" && method === "POST") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });
    req.on("end", async () => {
      try {
        const { userId, title, completed = false } = JSON.parse(body);
        if (!userId || !title) {
          res.writeHead(400, { "Content-Type": "application/json" });
          return res.end(
            JSON.stringify({ error: "userId va title kiritish shart" })
          );
        }

        const users = await readUsers();
        if (!users.find((user) => user.id === userId)) {
          res.writeHead(400, { "Content-Type": "application/json" });
          return res.end(
            JSON.stringify({ error: "Bunday foydalanuvchi mavjud emas" })
          );
        }

        const todos = await readTodos();
        const newTodo = {
          id: todos.length ? todos[todos.length - 1].id + 1 : 1,
          userId,
          title,
          completed,
        };

        todos.push(newTodo);
        await writeTodos(todos);

        res.writeHead(201, { "Content-Type": "application/json" });
        res.end(JSON.stringify(newTodo));
      } catch (error) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Noto'g'ri JSON formati" }));
      }
    });
  }
  else if (url.match(/^\/users\/\d+$/) && method === "PUT") {
    const id = parseInt(url.split("/")[2], 10);
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });
    req.on("end", async () => {
      try {
        const { name } = JSON.parse(body);
        if (!name) {
          res.writeHead(400, { "Content-Type": "application/json" });
          return res.end(
            JSON.stringify({ error: "Ism kiritish shart" })
          );
        }

        const users = await readUsers();
        const userIndex = users.findIndex((user) => user.id === id);
        if (userIndex === -1) {
          res.writeHead(404, { "Content-Type": "application/json" });
          return res.end(
            JSON.stringify({ error: "Bunday foydalanuvchi topilmadi" })
          );
        }

        users[userIndex].name = name;
        await writeUsers(users);

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(users[userIndex]));
      } catch (error) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Noto'g'ri JSON formati" }));
      }
    });
  }
  else if (url.match(/^\/users\/\d+$/) && method === "DELETE") {
    const id = parseInt(url.split("/")[2], 10);
    const users = await readUsers();
    const userIndex = users.findIndex((user) => user.id === id);

    if (userIndex === -1) {
      res.writeHead(404, { "Content-Type": "application/json" });
      return res.end(
        JSON.stringify({ error: "Bunday foydalanuvchi topilmadi" })
      );
    }

    users.splice(userIndex, 1);
    await writeUsers(users);

    const todos = await readTodos();
    const updatedTodos = todos.filter((todo) => todo.userId !== id);
    await writeTodos(updatedTodos);

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ message: "Foydalanuvchi va uning vazifalari o'chirildi" }));
  }
  else {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Sahifa topilmadi" }));
  }
});

const PORT = 8000;
server.listen(PORT, () =>
  console.log(`Server http://localhost:${PORT} da ishlamoqda`)
);