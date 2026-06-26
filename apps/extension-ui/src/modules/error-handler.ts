import isError from 'lodash/isError';
import isString from 'lodash/isString';
import { jeeError } from './jee-dialog';

export class ErrorHandler {

  handle(err: Error|{message: string, stack: string}|string) {
    let notificationMessage: string;
    if(isError(err)) {
      notificationMessage = err.message;
      console.error(err);
    } else if(isString(err)) {
      notificationMessage = err;
      console.error(err);
    } else {
      notificationMessage = err.message;
      console.error(`${err.message}\n${err.stack}`);
    }
    jeeError('Something went wrong', notificationMessage).catch(console.error);
  }

}
