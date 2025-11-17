import twilio from 'twilio';

let cachedConnectionSettings: any = null;

async function getCredentials() {
  if (cachedConnectionSettings) {
    return cachedConnectionSettings;
  }

  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  const response = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=twilio',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch Twilio connector settings: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const connectionSettings = data.items?.[0];

  if (!connectionSettings || !connectionSettings.settings) {
    throw new Error('Twilio connector not properly configured');
  }

  const settings = connectionSettings.settings;
  if (!settings.account_sid || !settings.api_key || !settings.api_key_secret) {
    throw new Error('Twilio connector missing required credentials (account_sid, api_key, api_key_secret)');
  }

  cachedConnectionSettings = {
    accountSid: settings.account_sid,
    apiKey: settings.api_key,
    apiKeySecret: settings.api_key_secret,
    phoneNumber: settings.phone_number,
    authToken: settings.auth_token
  };

  return cachedConnectionSettings;
}

export async function getTwilioClient() {
  const { accountSid, apiKey, apiKeySecret } = await getCredentials();
  return twilio(apiKey, apiKeySecret, {
    accountSid: accountSid
  });
}

export async function getTwilioPhoneNumber() {
  const { phoneNumber } = await getCredentials();
  return phoneNumber;
}

export async function getTwilioAuthToken() {
  const { authToken } = await getCredentials();
  if (!authToken) {
    throw new Error('Twilio auth token not available from connector');
  }
  return authToken;
}
