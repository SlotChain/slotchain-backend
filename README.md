# Replace 0xABC... with the wallet address to look up
curl -i http://localhost:5000/auth/user/0x255eC453F14Ed7ba3d7BEbF9F253E17778b6ADF3


forge script --chain sepolia script/SlotChain.s.sol:DeploySlotChain --rpc-url $SEPOLIA_RPC_URL --broadcast --verify -vvvvv
