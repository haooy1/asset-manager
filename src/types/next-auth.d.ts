import "next-auth"

declare module "next-auth" {
  interface User {
    id: string
    username: string
    role: string
    branchId: string | null
  }

  interface Session {
    user: {
      id: string
      name: string
      email: string
      username: string
      role: string
      branchId: string | null
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    username: string
    role: string
    branchId: string | null
  }
}
