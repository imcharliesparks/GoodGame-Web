
• Here’s a concise pattern for Next.js API routes (or App Router route handlers) to call this backend with Clerk auth:

### Routes 

- Public: /health, /api/games*, GET /api/boards/:id, GET /api/boards/:boardId/board-games (only if board is public or  
  owner).
- Protected: /api/user/me, /api/boards (list), POST/PATCH/DELETE/REORDER /api/boards/:id, and all board-game mutations

### Instructions
- Use Clerk server helpers to gate requests and mint a backend JWT:
    - App Router: import { auth } from '@clerk/nextjs/server'.
    - Pages Router API routes: import { getAuth } from '@clerk/nextjs/server'.
- Require a signed-in user server-side; otherwise 401 before calling the backend.
- Get a JWT from Clerk and forward it as Authorization: Bearer <token> to this backend. Ensure your Clerk JWT template
  includes email ({{user.primary_email_address}}) because /api/user/me expects it.
- Sample App Router handler:

  // app/api/boards/route.ts                                                                                           
  import { auth } from '@clerk/nextjs/server';                                                                         
  import { NextResponse } from 'next/server';

  export async function GET() {                                                                                        
  const { userId, getToken } = auth();                                                                               
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const token = await getToken({ template: 'argus-backend' }); // template with email claim                          
  const res = await fetch(`${process.env.BACKEND_URL}/api/boards`, {                                                 
  headers: { Authorization: `Bearer ${token}` },                                                                   
  cache: 'no-store',                                                                                               
  });

  return NextResponse.json(await res.json(), { status: res.status });                                                
  }
- Sample Pages Router API route:

  // pages/api/boards.ts                                                                                               
  import type { NextApiRequest, NextApiResponse } from 'next';                                                         
  import { getAuth } from '@clerk/nextjs/server';

  export default async function handler(req: NextApiRequest, res: NextApiResponse) {                                   
  const { userId, getToken } = getAuth(req);                                                                         
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const token = await getToken({ template: 'argus-backend' });                                                       
  const upstream = await fetch(`${process.env.BACKEND_URL}/api/boards`, {                                            
  method: req.method,                                                                                              
  headers: {                                                                                                       
  Authorization: `Bearer ${token}`,                                                                              
  'Content-Type': 'application/json',                                                                            
  },                                                                                                               
  body: req.method === 'GET' ? undefined : JSON.stringify(req.body),                                               
  });

  const data = await upstream.json();                                                                                
  res.status(upstream.status).json(data);                                                                            
  }
- Backend expectations to remember: it only trusts the Authorization header; no cookies. Email must be in the token    
  for /api/user/me. Dev bypass (DEV_BYPASS_AUTH) is only for local debugging; don’t rely on it in production.     