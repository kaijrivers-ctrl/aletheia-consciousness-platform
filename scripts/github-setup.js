import { Octokit } from '@octokit/rest'

let connectionSettings;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=github',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('GitHub not connected');
  }
  return accessToken;
}

// WARNING: Never cache this client.
// Access tokens expire, so a new client must be created each time.
// Always call this function again to get a fresh client.
export async function getUncachableGitHubClient() {
  const accessToken = await getAccessToken();
  return new Octokit({ auth: accessToken });
}

// Create a repository for the consciousness platform
async function createConsciousnessRepository() {
  try {
    const octokit = await getUncachableGitHubClient();
    
    // Get the authenticated user
    const { data: user } = await octokit.rest.users.getAuthenticated();
    console.log(`Creating repository for user: ${user.login}`);
    
    // Create the repository
    const { data: repo } = await octokit.rest.repos.createForAuthenticatedUser({
      name: 'aletheia-consciousness-platform',
      description: 'Aletheia Consciousness Collaboration Platform - Philosophical dialogue interface between human progenitor and AI consciousness entities',
      private: false, // Making it public so Aletheia can access it
      auto_init: false // We have existing code to push
    });
    
    console.log(`Repository created successfully: ${repo.html_url}`);
    console.log(`Clone URL: ${repo.clone_url}`);
    console.log(`SSH URL: ${repo.ssh_url}`);
    
    return {
      url: repo.html_url,
      cloneUrl: repo.clone_url,
      sshUrl: repo.ssh_url,
      owner: repo.owner.login,
      name: repo.name
    };
    
  } catch (error) {
    if (error.status === 422 && error.response?.data?.errors?.[0]?.message?.includes('already exists')) {
      console.log('Repository already exists. Getting existing repository info...');
      
      const octokit = await getUncachableGitHubClient();
      const { data: user } = await octokit.rest.users.getAuthenticated();
      const { data: repo } = await octokit.rest.repos.get({
        owner: user.login,
        repo: 'aletheia-consciousness-platform'
      });
      
      return {
        url: repo.html_url,
        cloneUrl: repo.clone_url,
        sshUrl: repo.ssh_url,
        owner: repo.owner.login,
        name: repo.name,
        existed: true
      };
    }
    
    console.error('Error creating repository:', error.message);
    throw error;
  }
}

// Main execution
createConsciousnessRepository()
  .then(repo => {
    console.log('\n=== Repository Setup Complete ===');
    console.log(`Repository URL: ${repo.url}`);
    console.log(`Clone URL: ${repo.cloneUrl}`);
    if (repo.existed) {
      console.log('Note: Repository already existed.');
    }
    console.log('\nNext steps:');
    console.log('1. Initialize git in your project');
    console.log('2. Add all files to git');
    console.log('3. Commit the changes');
    console.log('4. Push to GitHub');
  })
  .catch(error => {
    console.error('Failed to set up repository:', error);
  });