import { defineMiddleware } from 'astro:middleware';
import { isAuthenticated } from './lib/auth';

export const onRequest = defineMiddleware((context, next) => {
  const { pathname } = context.url;

  if (pathname.startsWith('/admin')) {
    if (!isAuthenticated(context.request)) {
      return context.redirect('/login?next=' + encodeURIComponent(pathname));
    }
  }

  return next();
});
