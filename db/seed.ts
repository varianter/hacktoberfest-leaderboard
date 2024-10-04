import { db, Users } from "astro:db";

export default async function () {
  await db.insert(Users).values([
    {
      id: 1,
      username: "mikaelbr",
      ignoreList: ["AtB-AS/", "varianter/", "mrfylke"],
    },
    { id: 2, username: "nikolaia", ignoreList: ["varianter/"] },
  ]);
}
