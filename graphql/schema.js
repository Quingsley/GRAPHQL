const { buildSchema } = require("graphql");
module.exports = buildSchema(`
type Post {
    _id: ID!
    title: String!
    content: String!
    imageUrl: String!
    createdAt: String!
    updatedAt: String!
    creator: User!
}
type User {
    _id: ID!
    email: String!
    password: String
    name: String!
    status: String
    posts: [Post!]!
}
type AuthData {
    token: String!
    userId: String!
}

input PostData {
    title: String!
    content: String!
    imageUrl: String!
}
input userData {
    name: String!
    email: String!
    password: String!
}

input userStatus {
    status: String!
}

type LoadPostData {
    posts: [Post!]!
    totalPosts: Int!
}

type RootMutation {
    signupUser(userInput: userData) : User!
    createPost(userInput: PostData) : Post!
     updatePost(postId: ID!,userInput: PostData) : Post!
     deletePost(postId: ID!) : Post!
     updateStatus(userInput: userStatus) : String!
}
type RootQuery {
    loginUser(email: String!, password: String!) : AuthData!
    loadPosts(currentPage: Int!) : LoadPostData!
    singlePost(postId: ID!) : Post!
    userStatus: String!
}
schema {
    query: RootQuery
    mutation: RootMutation
}
`);
