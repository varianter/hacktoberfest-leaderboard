import { ApolloClient, gql, InMemoryCache } from "@apollo/client/core";

const qClient = new ApolloClient({
  uri: "https://api.github.com/graphql",
  headers: {
    Authorization: `Bearer ${import.meta.env.GITHUB_TOKEN}`,
  },
  cache: new InMemoryCache(),
});

type GithubUser = {
  name: string;
  url: string;
  websiteUrl: string;
  login: string;
  contributionsCollection: ContributionsCollection;
};

type ContributionsCollection = {
  hasAnyContributions: boolean;
  totalPullRequestContributions: number;
  totalRepositoryContributions: number;
  totalIssueContributions: number;
  totalCommitContributions: number;
  commitContributionsByRepository: ContributionByRepository[];
  pullRequestContributionsByRepository: ContributionByRepository[];
  issueContributionsByRepository: IssueContributionByRepository[];
};

type ContributionByRepository = {
  repository: Repository;
  contributions: Contributions;
};

type IssueContributionByRepository = {
  repository: Repository;
  contributions: Contributions;
};

type Repository = {
  nameWithOwner: string;
  url: string;
  isPrivate?: boolean;
};

type Contributions = {
  totalCount: number;
};

type GithubData = {
  user: GithubUser;
};

export async function getContributionDataFromUsername(
  username: string,
  ignoreList: string[]
): Promise<GithubUser> {
  const query = gql`
    query GetUser($username: String!) {
      user(login: $username) {
        name
        login
        url
        websiteUrl

        contributionsCollection(
          from: "2024-10-01T00:00:00Z"
          to: "2024-10-31T00:00:00Z"
        ) {
          hasAnyContributions
          totalPullRequestContributions
          totalIssueContributions

          commitContributionsByRepository(maxRepositories: 100) {
            repository {
              nameWithOwner
              url
              isPrivate
            }
            contributions(first: 100) {
              totalCount

              # pageInfo {
              #   endCursor
              #   hasNextPage
              #   hasPreviousPage
              #   startCursor
              # }
              # nodes {
              #   occurredAt
              #   isRestricted
              #   url
              #   occurredAt
              # }
            }
          }

          pullRequestContributionsByRepository(maxRepositories: 100) {
            repository {
              nameWithOwner
              url
              isPrivate
            }
            contributions(first: 100) {
              totalCount

              # pageInfo {
              #   endCursor
              #   hasNextPage
              #   hasPreviousPage
              #   startCursor
              # }
              # nodes {
              #   occurredAt
              #   isRestricted
              #   pullRequest {
              #     url
              #     title
              #   }
              #   occurredAt
              # }
            }
          }

          issueContributionsByRepository(maxRepositories: 100) {
            repository {
              nameWithOwner
              url
            }
            contributions(first: 100) {
              totalCount
              # nodes {
              #   occurredAt
              #   issue {
              #     title
              #     url
              #   }
              # }
            }
          }

          #   contributionCalendar {
          #     totalContributions
          #     weeks {
          #       contributionDays {
          #         contributionCount
          #         date

          #       }
          #     }
          #   }
        }
      }
    }
  `;

  const response = await qClient.query<
    GithubData,
    {
      username: string;
    }
  >({
    query,
    variables: { username },
    fetchPolicy: "cache-first",
  });
  const pullRequestContributionsByRepository =
    response.data.user.contributionsCollection.pullRequestContributionsByRepository.filter(
      (i) => isAllowedRepository(i, ignoreList)
    );

  const commitContributionsByRepository =
    response.data.user.contributionsCollection.commitContributionsByRepository.filter(
      (i) => isAllowedRepository(i, ignoreList)
    );

  const issueContributionsByRepository =
    response.data.user.contributionsCollection.issueContributionsByRepository.filter(
      (i) => isAllowedRepository(i, ignoreList)
    );

  const totalIssueContributions = countContributions(
    issueContributionsByRepository
  );
  const totalPullRequestContributions = countContributions(
    pullRequestContributionsByRepository
  );
  const totalCommitContributions = countContributions(
    commitContributionsByRepository
  );

  const totalRepositoryContributions =
    totalIssueContributions +
    totalPullRequestContributions +
    totalCommitContributions;

  return {
    ...response.data.user,

    contributionsCollection: {
      ...response.data.user.contributionsCollection,

      totalIssueContributions,
      totalPullRequestContributions,
      totalCommitContributions,

      totalRepositoryContributions,
      hasAnyContributions: totalRepositoryContributions > 0,

      pullRequestContributionsByRepository,
      issueContributionsByRepository,
    },
  };
}

function isAllowedRepository(
  contributions: ContributionByRepository | IssueContributionByRepository,
  ignoreList: string[]
) {
  return ignoreList.every(
    (item) =>
      !contributions.repository.nameWithOwner
        .toLowerCase()
        .startsWith(item.toLowerCase()) && !contributions.repository.isPrivate
  );
}

function countContributions(
  contributions: IssueContributionByRepository[] | ContributionByRepository[]
) {
  return contributions.reduce(
    (acc, curr) => acc + curr.contributions.totalCount,
    0
  );
}
