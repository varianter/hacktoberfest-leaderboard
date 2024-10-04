import { gql, ApolloClient, InMemoryCache } from "@apollo/client/core";
import { db, Users } from "astro:db";

export async function getAllUsersFromDb() {
  const users = await db.select().from(Users).all();
  return users.map((user) => ({
    ...user,
    ignoreList: user.ignoreList as string[],
  }));
}
