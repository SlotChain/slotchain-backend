# SlotChain Backend

NestJS API and worker services for the SlotChain scheduling platform. The backend handles profile management, availability booking, blockchain synchronization, email notifications, and media uploads.

## Tech Stack

- NestJS 11 (Express adapter)
- MongoDB via Mongoose
- SendGrid for transactional email
- Pinata for IPFS uploads
- Ethers.js for on-chain interactions

## Prerequisites

- Node.js 18 or newer (LTS recommended)
- npm 9+
- MongoDB instance (Atlas or self-hosted)
- Credentials for:
  - Pinata (IPFS)
  - SendGrid (email delivery)
  - Zoom API (meeting generation)
  - Ethereum RPC provider (Base Sepolia)
- Deployed SlotChain smart contract

## Environment Variables

| Variable                                                    | Description                                                |
| ----------------------------------------------------------- | ---------------------------------------------------------- |
| `PORT`                                                      | HTTP port for the API server.                              |
| `MONGO_URI`                                                 | MongoDB connection string.                                 |
| `PINATA_API_KEY` / `PINATA_SECRET_KEY`                      | Pinata credentials for IPFS uploads.                       |
| `SENDGRID_API_KEY`                                          | SendGrid API key used for booking notifications.           |
| `SENDGRID_FROM_EMAIL` / `SENDGRID_FROM_NAME`                | Sender details for outgoing email.                         |
| `ZOOM_ACCOUNT_ID` / `ZOOM_CLIENT_ID` / `ZOOM_CLIENT_SECRET` | OAuth credentials for Zoom meeting creation.               |
| `CHAIN_RPC_URL`                                             | RPC endpoint for interacting with Base Sepolia.            |
| `SLOTCHAIN_CONTRACT_ADDRESS`                                | Address of the deployed SlotChain contract.                |
| `JWT`                                                       | Service token used when interacting with third-party APIs. |

## Project Structure Highlights

- `src/auth` – User authentication and profile workflows.
- `src/availability` – Slot management, bookings, and blockchain sync.
- `src/notifications` – Email notification
