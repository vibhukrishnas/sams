package com.testapp

import android.util.Log
import java.util.concurrent.*
import java.util.concurrent.atomic.AtomicInteger

/**
 * Custom ThreadPoolManager to handle threading issues
 * This addresses potential issues with threadpoolexecutor and thread management
 */
class ThreadPoolManager private constructor() {
    
    companion object {
        private const val TAG = "ThreadPoolManager"
        private const val CORE_POOL_SIZE = 4
        private const val MAXIMUM_POOL_SIZE = 8
        private const val KEEP_ALIVE_TIME = 60L
        
        @Volatile
        private var INSTANCE: ThreadPoolManager? = null
        
        fun getInstance(): ThreadPoolManager {
            return INSTANCE ?: synchronized(this) {
                INSTANCE ?: ThreadPoolManager().also { INSTANCE = it }
            }
        }
    }
    
    // Thread factory for creating named threads
    private class CustomThreadFactory(private val namePrefix: String) : ThreadFactory {
        private val threadNumber = AtomicInteger(1)
        private val group: ThreadGroup = Thread.currentThread().threadGroup ?: ThreadGroup("CustomThreadGroup")
        
        override fun newThread(r: Runnable): Thread {
            val thread = Thread(group, r, "$namePrefix-${threadNumber.getAndIncrement()}", 0)
            
            // Set thread properties
            if (thread.isDaemon) {
                thread.isDaemon = false
            }
            if (thread.priority != Thread.NORM_PRIORITY) {
                thread.priority = Thread.NORM_PRIORITY
            }
            
            // Add uncaught exception handler
            thread.setUncaughtExceptionHandler { t, e ->
                Log.e(TAG, "Uncaught exception in thread ${t.name}", e)
            }
            
            return thread
        }
    }
    
    // Custom rejection handler
    private class CustomRejectedExecutionHandler : RejectedExecutionHandler {
        override fun rejectedExecution(r: Runnable, executor: ThreadPoolExecutor) {
            Log.w(TAG, "Task rejected by executor. Queue size: ${executor.queue.size}, Active threads: ${executor.activeCount}")
            
            // Try to execute in the caller thread as fallback
            try {
                if (!executor.isShutdown) {
                    r.run()
                }
            } catch (e: Exception) {
                Log.e(TAG, "Failed to execute rejected task", e)
            }
        }
    }
    
    // Main thread pool executor
    private val mainExecutor: ThreadPoolExecutor = ThreadPoolExecutor(
        CORE_POOL_SIZE,
        MAXIMUM_POOL_SIZE,
        KEEP_ALIVE_TIME,
        TimeUnit.SECONDS,
        LinkedBlockingQueue<Runnable>(100),
        CustomThreadFactory("MainPool"),
        CustomRejectedExecutionHandler()
    ).apply {
        allowCoreThreadTimeOut(true)
    }
    
    // Background task executor
    private val backgroundExecutor: ThreadPoolExecutor = ThreadPoolExecutor(
        2,
        4,
        KEEP_ALIVE_TIME,
        TimeUnit.SECONDS,
        LinkedBlockingQueue<Runnable>(50),
        CustomThreadFactory("BackgroundPool"),
        CustomRejectedExecutionHandler()
    ).apply {
        allowCoreThreadTimeOut(true)
    }
    
    // Network task executor
    private val networkExecutor: ThreadPoolExecutor = ThreadPoolExecutor(
        3,
        6,
        KEEP_ALIVE_TIME,
        TimeUnit.SECONDS,
        LinkedBlockingQueue<Runnable>(75),
        CustomThreadFactory("NetworkPool"),
        CustomRejectedExecutionHandler()
    ).apply {
        allowCoreThreadTimeOut(true)
    }
    
    // Scheduled executor for periodic tasks
    private val scheduledExecutor: ScheduledThreadPoolExecutor = ScheduledThreadPoolExecutor(
        2,
        CustomThreadFactory("ScheduledPool")
    ).apply {
        setRejectedExecutionHandler(CustomRejectedExecutionHandler())
    }
    
    /**
     * Execute task on main thread pool
     */
    fun executeMain(task: Runnable) {
        try {
            mainExecutor.execute(task)
        } catch (e: RejectedExecutionException) {
            Log.w(TAG, "Main executor rejected task", e)
            executeBackground(task) // Fallback to background executor
        }
    }
    
    /**
     * Execute task on background thread pool
     */
    fun executeBackground(task: Runnable) {
        try {
            backgroundExecutor.execute(task)
        } catch (e: RejectedExecutionException) {
            Log.w(TAG, "Background executor rejected task", e)
            // Execute in current thread as last resort
            task.run()
        }
    }
    
    /**
     * Execute network task
     */
    fun executeNetwork(task: Runnable) {
        try {
            networkExecutor.execute(task)
        } catch (e: RejectedExecutionException) {
            Log.w(TAG, "Network executor rejected task", e)
            executeBackground(task) // Fallback to background executor
        }
    }
    
    /**
     * Schedule task with delay
     */
    fun schedule(task: Runnable, delay: Long, unit: TimeUnit): ScheduledFuture<*>? {
        return try {
            scheduledExecutor.schedule(task, delay, unit)
        } catch (e: RejectedExecutionException) {
            Log.w(TAG, "Scheduled executor rejected task", e)
            // Execute immediately as fallback
            task.run()
            null
        }
    }

    /**
     * Schedule task with fixed rate
     */
    fun scheduleAtFixedRate(task: Runnable, initialDelay: Long, period: Long, unit: TimeUnit): ScheduledFuture<*>? {
        return try {
            scheduledExecutor.scheduleAtFixedRate(task, initialDelay, period, unit)
        } catch (e: RejectedExecutionException) {
            Log.w(TAG, "Scheduled executor rejected fixed rate task", e)
            // Execute immediately as fallback
            task.run()
            null
        }
    }
    
    /**
     * Submit task with result
     */
    fun <T> submit(task: Callable<T>): Future<T> {
        return try {
            mainExecutor.submit(task)
        } catch (e: RejectedExecutionException) {
            Log.w(TAG, "Main executor rejected callable task", e)
            // Execute immediately and return completed future
            try {
                val result = task.call()
                CompletableFuture.completedFuture(result)
            } catch (ex: Exception) {
                val future = CompletableFuture<T>()
                future.completeExceptionally(ex)
                future
            }
        }
    }
    
    /**
     * Get executor statistics
     */
    fun getStatistics(): Map<String, Any> {
        return mapOf(
            "mainExecutor" to mapOf(
                "activeCount" to mainExecutor.activeCount,
                "queueSize" to mainExecutor.queue.size,
                "completedTaskCount" to mainExecutor.completedTaskCount,
                "poolSize" to mainExecutor.poolSize
            ),
            "backgroundExecutor" to mapOf(
                "activeCount" to backgroundExecutor.activeCount,
                "queueSize" to backgroundExecutor.queue.size,
                "completedTaskCount" to backgroundExecutor.completedTaskCount,
                "poolSize" to backgroundExecutor.poolSize
            ),
            "networkExecutor" to mapOf(
                "activeCount" to networkExecutor.activeCount,
                "queueSize" to networkExecutor.queue.size,
                "completedTaskCount" to networkExecutor.completedTaskCount,
                "poolSize" to networkExecutor.poolSize
            ),
            "scheduledExecutor" to mapOf(
                "activeCount" to scheduledExecutor.activeCount,
                "queueSize" to scheduledExecutor.queue.size,
                "completedTaskCount" to scheduledExecutor.completedTaskCount,
                "poolSize" to scheduledExecutor.poolSize
            )
        )
    }
    
    /**
     * Shutdown all executors gracefully
     */
    fun shutdown() {
        Log.d(TAG, "Shutting down thread pools...")
        
        try {
            // Shutdown executors
            mainExecutor.shutdown()
            backgroundExecutor.shutdown()
            networkExecutor.shutdown()
            scheduledExecutor.shutdown()
            
            // Wait for termination
            if (!mainExecutor.awaitTermination(5, TimeUnit.SECONDS)) {
                mainExecutor.shutdownNow()
            }
            if (!backgroundExecutor.awaitTermination(5, TimeUnit.SECONDS)) {
                backgroundExecutor.shutdownNow()
            }
            if (!networkExecutor.awaitTermination(5, TimeUnit.SECONDS)) {
                networkExecutor.shutdownNow()
            }
            if (!scheduledExecutor.awaitTermination(5, TimeUnit.SECONDS)) {
                scheduledExecutor.shutdownNow()
            }
            
            Log.d(TAG, "Thread pools shutdown completed")
            
        } catch (e: InterruptedException) {
            Log.w(TAG, "Interrupted during shutdown", e)
            Thread.currentThread().interrupt()
            
            // Force shutdown
            mainExecutor.shutdownNow()
            backgroundExecutor.shutdownNow()
            networkExecutor.shutdownNow()
            scheduledExecutor.shutdownNow()
        }
    }
    
    /**
     * Force shutdown all executors immediately
     */
    fun shutdownNow() {
        Log.d(TAG, "Force shutting down thread pools...")
        
        mainExecutor.shutdownNow()
        backgroundExecutor.shutdownNow()
        networkExecutor.shutdownNow()
        scheduledExecutor.shutdownNow()
        
        Log.d(TAG, "Force shutdown completed")
    }
}
