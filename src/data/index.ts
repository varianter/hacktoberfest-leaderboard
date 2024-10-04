import { getAllUsersFromDb } from "./db";
import { getContributionDataFromUsername } from "./github";

export async function getAllUserData() {
  const users = await getAllUsersFromDb();

  const data = Promise.all(
    users.map((u) => getContributionDataFromUsername(u.username, u.ignoreList))
  );

  return (await data).toSorted(function sortByContributions(a, b) {
    return (
      b.contributionsCollection.totalRepositoryContributions -
      a.contributionsCollection.totalRepositoryContributions
    );
  });
}
