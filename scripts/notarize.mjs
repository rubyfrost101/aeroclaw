import { notarize } from '@electron/notarize'

export default async function notarizeApp(context) {
  const { electronPlatformName, appOutDir, packager } = context

  if (electronPlatformName !== 'darwin') {
    return
  }

  const appName = packager.appInfo.productFilename
  const appPath = `${appOutDir}/${appName}.app`
  const keychainProfile = process.env.APPLE_NOTARY_PROFILE
  const appleId = process.env.APPLE_ID
  const appleIdPassword = process.env.APPLE_APP_SPECIFIC_PASSWORD
  const teamId = process.env.APPLE_TEAM_ID
  const appleApiKey = process.env.APPLE_API_KEY
  const appleApiKeyId = process.env.APPLE_API_KEY_ID
  const appleApiIssuer = process.env.APPLE_API_ISSUER

  const hasKeychainProfile = Boolean(keychainProfile)
  const hasAppleIdCredentials = Boolean(appleId && appleIdPassword && teamId)
  const hasApiKeyCredentials = Boolean(appleApiKey && appleApiKeyId && appleApiIssuer)

  if (!hasKeychainProfile && !hasAppleIdCredentials && !hasApiKeyCredentials) {
    console.log('[notarize] skip: no Apple notarization credentials detected')
    return
  }

  if (hasKeychainProfile) {
    await notarize({
      appPath,
      keychainProfile,
    })
    return
  }

  if (hasApiKeyCredentials) {
    await notarize({
      appPath,
      appleApiKey,
      appleApiKeyId,
      appleApiIssuer,
      teamId,
    })
    return
  }

  await notarize({
    appPath,
    appleId,
    appleIdPassword,
    teamId,
  })
}
