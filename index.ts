import '@webb-tools/tangle-substrate-types'

import { ApiPromise, WsProvider } from '@polkadot/api'

enum HexType {
  EVM = 'EVM',
  Native = 'Native',
}

const TANGLE_RPC_ENDPOINT = 'ws://127.0.0.1:9944'

const RECIPIENT = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'
const RECIPIENT_TYPE = HexType.EVM

const SIGNER = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'
const SIGNER_TYPE = HexType.EVM

// Get the sign message from PolkadotJS UI -> Accounts -> Claim Tokens
// 1. Select an account
// 2. Enter the EVM address that you will use to sign the message
// 3. Copy the message
// 4. Go to: https://app.mycrypto.com/sign-message to sign the message and copy the payload
// You can get the signature from the payload by the `sig` property
const SIGNATURE =
  '0x5eb9a20c72fc9ca56f3b318590a0d65ef36012da92d335637b04166bcc18f6c90ed39580735c629f78afcd8ce695cff91ba085c0914c645d22cb44a7d54679901c'
const SIGNATURE_TYPE = HexType.EVM

;(async () => {
  console.log(`Initializing API with Tangle endpoint: ${TANGLE_RPC_ENDPOINT}`)
  const wsProvider = new WsProvider(TANGLE_RPC_ENDPOINT)
  const apiPromise = await ApiPromise.create({
    provider: wsProvider,
    noInitWarn: true,
  })

  console.log(`Calling tx.claims.claim`)
  const tx = apiPromise.tx.claims.claim(
    { [RECIPIENT_TYPE]: RECIPIENT }, // destAccount
    { [SIGNER_TYPE]: SIGNER }, // signer
    { [SIGNATURE_TYPE]: SIGNATURE } // signataure
  )

  console.log(`Sending transaction with args ${tx.args.toString()}`)
  await tx
    .send(async result => {
      console.log('Received result', result)
      const status = result.status
      const events = result.events.filter(
        ({ event: { section } }) => section === 'system'
      )

      if (status.isInBlock || status.isFinalized) {
        for (const event of events) {
          const {
            event: { data, method },
          } = event
          const [dispatchError] = data as any

          if (method === 'ExtrinsicFailed') {
            let message = dispatchError.type

            if (dispatchError.isModule) {
              try {
                const mod = dispatchError.asModule
                const error = dispatchError.registry.findMetaError(mod)

                message = `${error.section}.${error.name}`
              } catch (error) {
                console.error(`Error message: ${message}`)
                console.error(error)
              }
            } else if (dispatchError.isToken) {
              message = `${dispatchError.type}.${dispatchError.asToken.type}`
            }

            console.error(`Error message: ${message}`)
          } else if (method === 'ExtrinsicSuccess' && status.isFinalized) {
            // Resolve with the block hash
            console.log(
              `Transaction included at blockHash ${status.asFinalized.toString()}`
            )
          }
        }
      }
    })
    .catch(error => {
      console.error(error)
    })
})()
