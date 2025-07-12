import cron from 'node-cron';
import { logger } from '../utils/logger';

export class SchedulerService {
  private static tasks: Map<string, cron.ScheduledTask> = new Map();

  public static initialize(): void {
    logger.info('Initializing Scheduler Service...');

    // Health check task - every 5 minutes
    this.scheduleTask('health-check', '*/5 * * * *', () => {
      this.performHealthCheck();
    });

    // Cleanup task - daily at 2 AM
    this.scheduleTask('cleanup', '0 2 * * *', () => {
      this.performCleanup();
    });

    // Alert processing - every minute
    this.scheduleTask('alert-processing', '* * * * *', () => {
      this.processAlerts();
    });

    logger.info('Scheduler Service initialized successfully');
  }

  public static scheduleTask(name: string, schedule: string, task: () => void): void {
    try {
      const scheduledTask = cron.schedule(schedule, task, {
        scheduled: false
      });

      this.tasks.set(name, scheduledTask);
      scheduledTask.start();
      
      logger.info(`Scheduled task '${name}' with schedule '${schedule}'`);
    } catch (error) {
      logger.error(`Failed to schedule task '${name}':`, error);
    }
  }

  public static stopTask(name: string): void {
    const task = this.tasks.get(name);
    if (task) {
      task.stop();
      this.tasks.delete(name);
      logger.info(`Stopped task '${name}'`);
    }
  }

  public static stop(): void {
    logger.info('Stopping all scheduled tasks...');
    
    for (const [name, task] of this.tasks) {
      task.stop();
      logger.info(`Stopped task '${name}'`);
    }
    
    this.tasks.clear();
    logger.info('All scheduled tasks stopped');
  }

  private static performHealthCheck(): void {
    logger.debug('Performing scheduled health check...');
    // Add health check logic here
  }

  private static performCleanup(): void {
    logger.info('Performing scheduled cleanup...');
    // Add cleanup logic here
  }

  private static processAlerts(): void {
    logger.debug('Processing scheduled alerts...');
    // Add alert processing logic here
  }

  public static getActiveTasks(): string[] {
    return Array.from(this.tasks.keys());
  }
}
