import JSEncrypt from 'jsencrypt'

// Public-key encryption helper. Supply your own public key; private keys belong on the server.
// Login does not persist passwords and does not use this helper.
export function encrypt(text, publicKey) {
  if (!publicKey) throw new Error('A public key is required')
  const encryptor = new JSEncrypt()
  encryptor.setPublicKey(publicKey)
  return encryptor.encrypt(text)
}
