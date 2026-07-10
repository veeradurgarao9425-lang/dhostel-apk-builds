const fs = require('fs');
const path = require('path');

const routesDir = path.join(__dirname, 'src', 'routes');
const files = fs.readdirSync(routesDir);

const skipFiles = ['auth.routes.ts', 'user.routes.ts', 'hostel.routes.ts', 'subscriptionRoutes.ts'];

for (const file of files) {
  if (skipFiles.includes(file)) continue;
  if (!file.endsWith('.ts')) continue;
  
  const filePath = path.join(routesDir, file);
  let content = fs.readFileSync(filePath, 'utf-8');

  // Check if it has authMiddleware
  if (content.includes('authMiddleware') && !content.includes('requireActiveSubscription')) {
    // Add import
    content = content.replace(
      "import { authMiddleware } from '../middleware/auth.js';",
      "import { authMiddleware } from '../middleware/auth.js';\nimport { requireActiveSubscription } from '../middleware/subscriptionAuth.js';"
    );
    
    // Replace router.use
    content = content.replace(
      'router.use(authMiddleware);',
      'router.use(authMiddleware, requireActiveSubscription);'
    );
    
    // Sometimes it's used in specific routes like `router.get('/', authMiddleware, ...)`
    // We'll replace those too if `router.use(authMiddleware, requireActiveSubscription);` wasn't found
    if (!content.includes('router.use(authMiddleware, requireActiveSubscription);')) {
      content = content.replace(/authMiddleware,/g, 'authMiddleware, requireActiveSubscription,');
    }

    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`Patched ${file}`);
  }
}
