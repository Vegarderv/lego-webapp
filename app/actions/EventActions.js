import { arrayOf } from 'normalizr';
import { eventSchema } from 'app/reducers';
import createQueryString from 'app/utils/createQueryString';
import callAPI from 'app/actions/callAPI';
import { Event } from './ActionTypes';

export function fetchEvent(eventId) {
  return callAPI({
    types: Event.FETCH,
    endpoint: `/events/${eventId}/`,
    schema: eventSchema,
    meta: {
      errorMessage: 'Fetching event failed'
    }
  });
}

export function fetchAll({ year, month } = {}) {
  return callAPI({
    types: Event.FETCH,
    endpoint: `/events/${createQueryString({ year, month })}`,
    schema: arrayOf(eventSchema),
    meta: {
      errorMessage: 'Fetching events failed'
    }
  });
}

export function register(eventId) {
  return callAPI({
    types: Event.REGISTER,
    endpoint: `/events/${eventId}/registrations/`,
    method: 'post',
    body: {},
    meta: {
      errorMessage: 'Registering to event failed'
    }
  });
}

export function unregister(eventId, registrationId) {
  return callAPI({
    types: Event.UNREGISTER,
    endpoint: `/events/${eventId}/registrations/${registrationId}/`,
    method: 'delete',
    meta: {
      errorMessage: 'Unregistering from event failed'
    }
  });
}
