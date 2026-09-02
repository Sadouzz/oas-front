import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { map } from 'rxjs';

/**
 * Global HTTP Interceptor that automatically unwraps Spring Boot `ApiResponse<T>` envelopes.
 * When the backend returns `{ status: 200, success: true, message: "...", data: ... }`,
 * this interceptor extracts `data` so services receive the unwrapped payload transparently.
 */
export const apiResponseInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    map(event => {
      if (event instanceof HttpResponse && event.body) {
        const body: any = event.body;

        // Désenveloppe uniquement l'enveloppe ApiResponse<T> ({ success, data, message })
        // pour préserver intégralement l'objet PageResponse<T> (currentPage, totalElements, content, etc.)
        let unwrapped = body;
        if (body && typeof body === 'object' && ('data' in body || 'success' in body)) {
          unwrapped = body.data !== undefined ? body.data : body;
        }

        return event.clone({ body: unwrapped });
      }
      return event;
    })
  );
};
