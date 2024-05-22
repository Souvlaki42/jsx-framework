# jsx-framework

A custom JSX server-first toy javascript framework made in Bun and Typescript.

## Dependencies

- Linux or Max is preferable but Windows should be just fine.
- Bun v1 or later for Windows, Mac, Linux: [https://bun.sh/](https://bun.sh/).
- Everything else is listed in package.json.

## How to run

- Clone the repo using: `git clone https://github.com/Souvlaki42/jsx-framework.git`.
- Install dependencies from package.json using: `bun install`.
- Use `bun start` to execute the server and `bun dev` to do the same but have hot reloading enabled.
- Optional: you can create a `.env.local` file and define `PORT`, `PAGES_DIR`, `PUBLIC_DIR` and `NODE_ENV`.
- Here are their default values:

```bash
PORT=3000
PAGES_DIR="./src/pages"
PUBLIC_DIR="./public"
NODE_ENV="development"
```

## Important Links

Project's progress board: [https://github.com/users/Souvlaki42/projects/1](https://github.com/users/Souvlaki42/projects/1)

## Just for consistancy

- Prefer double quotes instead of single quotes when possible
- Prefer 2 spaces over tabs or anything else
- Prefer camelCase when possible

## What it currently does (it may be outdated)

The only thing that the framework currently does is to serve pages like this:

![Screenshot of the current stage of the app](https://raw.githubusercontent.com/Souvlaki42/jsx-framework/main/public/screenshots/current-stage.png)
