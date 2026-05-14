export const typeDefs = `#graphql
  scalar DateTime

  type Url {
    id: ID!
    shortCode: String!
    longUrl: String!
    createdAt: DateTime!
    expiresAt: DateTime
  }

  type Query {
    """Look up a short URL by its code. Returns null if not found."""
    getUrl(shortCode: String!): Url
  }

  type Mutation {
    """Create a new short URL for the given long URL."""
    createShortUrl(longUrl: String!, expiresAt: DateTime): Url!

    """Delete a short URL by its code. Returns true if deleted, false if not found."""
    deleteShortUrl(shortCode: String!): Boolean!
  }
`;

/**
 * scalar DateTime is a custom scalar.
 * id: ID! is the GraphQL convention. ID is serialized as a String even though our DB column is BigInt.
 */
