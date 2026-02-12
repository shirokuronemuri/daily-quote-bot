import { ErrorHandler, GrammyError, HttpError } from 'grammy';
import { MyContext } from 'src/types';

export const errorHandler: ErrorHandler<MyContext> = (err) => {
  const { ctx, error } = err;
  let errorMessage = `Bot error in update ${ctx.update.update_id}:\n`;
  if (error instanceof GrammyError) {
    errorMessage += `Telegram API error (code: ${error.error_code}): ${error.description}`;
    console.error(errorMessage);
    if (error.error_code === 429) {
      const retryAfter = error.parameters.retry_after;
      console.error('Rate limited. Retry after:', retryAfter);
    }
  } else {
    if (error instanceof HttpError) {
      errorMessage += 'Failed to connect to telegram API:';
    } else {
      errorMessage += `Unknown error:`;
    }
    console.error(errorMessage);
    console.error(error);
  }
};
