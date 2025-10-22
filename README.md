# Replace 0xABC... with the wallet address to look up

curl -i http://localhost:5000/auth/user/0x255eC453F14Ed7ba3d7BEbF9F253E17778b6ADF3

forge script --chain sepolia script/SlotChain.s.sol:DeploySlotChain --rpc-url $SEPOLIA_RPC_URL --broadcast --verify -vvvvv
forge script --chain sepolia script/SlotChainImp.s.sol:DeploySlotChainIMP --rpc-url $SEPOLIA_RPC_URL --broadcast --verify -vvvvv

## Environment Variables

Add the following to your backend `.env` (values supplied separately):

SENDGRID_API_KEY
SENDGRID_FROM_EMAIL
SENDGRID_FROM_NAME
ZOOM_ACCOUNT_ID
ZOOM_CLIENT_ID
ZOOM_CLIENT_SECRET

All bookings are stored in the new `bookings` collection with the creator wallet, creator email, buyer email, and the generated Zoom meeting links. A booking is created once the on-chain transaction confirms, the slot is marked as booked, and the Zoom meeting + SendGrid notifications succeed.
