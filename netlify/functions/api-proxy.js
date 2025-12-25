// Netlify Function to proxy API requests and avoid CORS issues
exports.handler = async (event, context) => {
  // Handle CORS preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Accept',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Max-Age': '86400',
      },
      body: '',
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  // Determine API path from the original request URL
  // Since we have specific redirects, we can determine the path from headers or request body
  let path = '';
  
  // Check all possible headers that Netlify might set
  const originalPath = event.headers['x-netlify-original-path'] || 
                       event.headers['x-forwarded-uri'] ||
                       event.headers['referer']?.split('?')[0] ||
                       '';
  
  // Extract path from original request
  if (originalPath) {
    if (originalPath.includes('/api/Auth/login')) {
      path = '/Auth/login';
    } else if (originalPath.includes('/api/Auth/register')) {
      path = '/Auth/register';
    } else if (originalPath.includes('/api/')) {
      // Extract path after /api/
      const match = originalPath.match(/\/api(\/.*?)(?:\?|$)/);
      if (match) {
        path = match[1];
      }
    }
  }
  
  // If still no path, try to determine from request body
  if (!path && event.body) {
    try {
      const body = JSON.parse(event.body);
      if (body.LoginType !== undefined) {
        path = '/Auth/login';
      } else if (body.FullName !== undefined || body.UserName !== undefined) {
        path = '/Auth/register';
      }
    } catch (e) {
      // Body parsing failed, ignore
    }
  }
  
  // Fallback: use common paths
  if (!path) {
    // Default based on common patterns
    path = '/Auth/login'; // Default, but this shouldn't happen
  }
  
  const apiUrl = `https://elghazaly.runasp.net/api${path}`;
  
  console.log('=== Proxy Debug Info ===');
  console.log('Event path:', event.path);
  console.log('Event rawPath:', event.rawPath);
  console.log('Original path header:', event.headers['x-netlify-original-path']);
  console.log('X-Forwarded-URI:', event.headers['x-forwarded-uri']);
  console.log('All headers:', Object.keys(event.headers));
  console.log('Determined path:', path);
  console.log('Final API URL:', apiUrl);
  console.log('Request body preview:', event.body?.substring(0, 200));
  console.log('========================');

  console.log('Proxying request to:', apiUrl);
  console.log('Request body:', event.body);

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: event.body,
    });

    const data = await response.text();
    
    console.log('API Response status:', response.status);
    console.log('API Response:', data);
    
    return {
      statusCode: response.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Accept',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: data,
    };
  } catch (error) {
    console.error('Proxy error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ error: error.message }),
    };
  }
};

