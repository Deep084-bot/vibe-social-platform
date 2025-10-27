const postsRoute = require('../backend/routes/posts');

describe('Posts route smoke test', () => {
  test('exports an express router or object', () => {
    expect(postsRoute).toBeDefined();
    // Express routers are functions with handle/stack or are objects
    const isRouter = typeof postsRoute === 'function' || typeof postsRoute === 'object';
    expect(isRouter).toBe(true);
  });
});
