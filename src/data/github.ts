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
  login: string;
  url: string;
  websiteUrl: string;
  contributionsCollection: ContributionsCollection;
};

type ContributionsCollection = {
  hasAnyContributions: boolean;
  totalPullRequestContributions: number;
  totalIssueContributions: number;
  totalRepositoryContributions: number;
  pullRequestContributionsByRepository: PullRequestContributionByRepository[];
  issueContributionsByRepository: IssueContributionByRepository[];
  contributionCalendar: ContributionCalendar;
};

type PullRequestContributionByRepository = {
  repository: Repository;
  contributions: Contributions;
};

type IssueContributionByRepository = {
  repository: Repository;
  contributions: IssueContributions;
};

type Repository = {
  nameWithOwner: string;
  url: string;
};

type Contributions = {
  totalCount: number;
  pageInfo: PageInfo;
  nodes: PullRequestContributionNode[];
};

type IssueContributions = {
  totalCount: number;
  nodes: IssueContributionNode[];
};

type PageInfo = {
  endCursor: string;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor: string;
};

type PullRequestContributionNode = {
  occurredAt: string;
  pullRequest: PullRequest;
  isRestricted: boolean;
  url: string;
};

type IssueContributionNode = {
  occurredAt: string;
  issue: Issue;
  url: string;
};

type PullRequest = {
  url: string;
  title: string;
};

type Issue = {
  title: string;
  url: string;
};

type ContributionCalendar = {
  totalContributions: number;
  weeks: Week[];
};

type Week = {
  contributionDays: ContributionDay[];
};

type ContributionDay = {
  contributionCount: number;
  date: string;
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
          from: "2024-07-01T00:00:00Z"
          to: "2024-10-31T00:00:00Z"
        ) {
          hasAnyContributions
          totalPullRequestContributions
          totalIssueContributions

          pullRequestContributionsByRepository(maxRepositories: 100) {
            repository {
              nameWithOwner
              url
            }
            contributions(first: 100) {
              totalCount
              pageInfo {
                endCursor
                hasNextPage
                hasPreviousPage
                startCursor
              }
              nodes {
                occurredAt
                pullRequest {
                  url
                  title
                }
                occurredAt
              }
            }
          }

          issueContributionsByRepository(maxRepositories: 100) {
            repository {
              nameWithOwner
              url
            }
            contributions(first: 100) {
              totalCount
              nodes {
                occurredAt
                issue {
                  title
                  url
                }
              }
            }
          }

          contributionCalendar {
            totalContributions
            weeks {
              contributionDays {
                contributionCount
                date
              }
            }
          }
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

  return {
    ...response.data.user,

    contributionsCollection: {
      ...response.data.user.contributionsCollection,

      totalIssueContributions,
      totalPullRequestContributions,
      totalRepositoryContributions:
        totalIssueContributions + totalPullRequestContributions,
      hasAnyContributions:
        totalIssueContributions + totalPullRequestContributions > 0,

      pullRequestContributionsByRepository,
      issueContributionsByRepository,
    },
  };
}

function isAllowedRepository(
  contributions:
    | PullRequestContributionByRepository
    | IssueContributionByRepository,
  ignoreList: string[]
) {
  return ignoreList.every(
    (item) =>
      !contributions.repository.nameWithOwner
        .toLowerCase()
        .startsWith(item.toLowerCase())
  );
}

function countContributions(
  contributions:
    | IssueContributionByRepository[]
    | PullRequestContributionByRepository[]
) {
  return contributions.reduce(
    (acc, curr) => acc + curr.contributions.totalCount,
    0
  );
}
