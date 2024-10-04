import { column, defineDb, defineTable } from "astro:db";

const Users = defineTable({
  columns: {
    id: column.number({ primaryKey: true }),
    username: column.text(),
    ignoreList: column.json({
      default: [],
    }),
  },
});

// https://astro.build/db/config
export default defineDb({
  tables: { Users },
});
