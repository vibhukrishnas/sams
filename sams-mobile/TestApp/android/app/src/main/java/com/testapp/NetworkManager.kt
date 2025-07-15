package com.testapp

import android.util.Log
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.IOException
import java.util.concurrent.TimeUnit
import java.util.concurrent.Executors
import java.util.concurrent.ThreadPoolExecutor

/**
 * Custom NetworkManager to handle HTTP requests and fix networking issues
 * This addresses potential issues with bundledownloader, multipartstreamreader, and realcall
 */
class NetworkManager private constructor() {
    
    companion object {
        private const val TAG = "NetworkManager"
        private const val CONNECT_TIMEOUT = 30L
        private const val READ_TIMEOUT = 60L
        private const val WRITE_TIMEOUT = 60L
        
        @Volatile
        private var INSTANCE: NetworkManager? = null
        
        fun getInstance(): NetworkManager {
            return INSTANCE ?: synchronized(this) {
                INSTANCE ?: NetworkManager().also { INSTANCE = it }
            }
        }
    }
    
    // Custom thread pool executor to handle network operations
    private val networkExecutor: ThreadPoolExecutor = Executors.newFixedThreadPool(8) as ThreadPoolExecutor
    
    // Custom OkHttpClient with proper configuration
    private val okHttpClient: OkHttpClient by lazy {
        OkHttpClient.Builder()
            .connectTimeout(CONNECT_TIMEOUT, TimeUnit.SECONDS)
            .readTimeout(READ_TIMEOUT, TimeUnit.SECONDS)
            .writeTimeout(WRITE_TIMEOUT, TimeUnit.SECONDS)
            .retryOnConnectionFailure(true)
            .addInterceptor(LoggingInterceptor())
            .addInterceptor(RetryInterceptor())
            .dispatcher(Dispatcher(networkExecutor))
            .build()
    }
    
    /**
     * Custom logging interceptor to debug network issues
     */
    private class LoggingInterceptor : Interceptor {
        override fun intercept(chain: Interceptor.Chain): Response {
            val request = chain.request()
            Log.d(TAG, "Request: ${request.method} ${request.url}")
            
            return try {
                val response = chain.proceed(request)
                Log.d(TAG, "Response: ${response.code} for ${request.url}")
                response
            } catch (e: Exception) {
                Log.e(TAG, "Network error for ${request.url}", e)
                throw e
            }
        }
    }
    
    /**
     * Custom retry interceptor to handle failed requests
     */
    private class RetryInterceptor : Interceptor {
        override fun intercept(chain: Interceptor.Chain): Response {
            val request = chain.request()
            var response: Response? = null
            var exception: IOException? = null
            
            // Retry up to 3 times
            repeat(3) { attempt ->
                try {
                    response?.close() // Close previous response if any
                    response = chain.proceed(request)
                    
                    if (response!!.isSuccessful) {
                        return response!!
                    }
                    
                    Log.w(TAG, "Request failed with code ${response!!.code}, attempt ${attempt + 1}")
                    
                } catch (e: IOException) {
                    Log.w(TAG, "Network error on attempt ${attempt + 1}", e)
                    exception = e
                    
                    if (attempt < 2) {
                        // Wait before retry
                        try {
                            Thread.sleep(1000L * (attempt + 1))
                        } catch (ie: InterruptedException) {
                            Thread.currentThread().interrupt()
                            throw e
                        }
                    }
                }
            }
            
            // If we get here, all retries failed
            return response ?: throw (exception ?: IOException("Unknown network error"))
        }
    }
    
    /**
     * Execute GET request
     */
    fun get(url: String, callback: (String?, Exception?) -> Unit) {
        val request = Request.Builder()
            .url(url)
            .get()
            .build()
            
        executeRequest(request, callback)
    }
    
    /**
     * Execute POST request
     */
    fun post(url: String, json: String, callback: (String?, Exception?) -> Unit) {
        val mediaType = "application/json; charset=utf-8".toMediaType()
        val requestBody = json.toRequestBody(mediaType)
        
        val request = Request.Builder()
            .url(url)
            .post(requestBody)
            .build()
            
        executeRequest(request, callback)
    }
    
    /**
     * Execute multipart request (fixes multipartstreamreader issues)
     */
    fun postMultipart(url: String, parts: Map<String, String>, callback: (String?, Exception?) -> Unit) {
        val multipartBuilder = MultipartBody.Builder()
            .setType(MultipartBody.FORM)
            
        parts.forEach { (key, value) ->
            multipartBuilder.addFormDataPart(key, value)
        }
        
        val request = Request.Builder()
            .url(url)
            .post(multipartBuilder.build())
            .build()
            
        executeRequest(request, callback)
    }
    
    /**
     * Execute request with proper error handling
     */
    private fun executeRequest(request: Request, callback: (String?, Exception?) -> Unit) {
        networkExecutor.execute {
            try {
                okHttpClient.newCall(request).execute().use { response ->
                    if (response.isSuccessful) {
                        val body = response.body?.string()
                        callback(body, null)
                    } else {
                        callback(null, IOException("HTTP ${response.code}: ${response.message}"))
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "Request execution failed", e)
                callback(null, e)
            }
        }
    }
    
    /**
     * Download file with progress (fixes bundledownloader issues)
     */
    fun downloadFile(url: String, progressCallback: (Int) -> Unit, callback: (ByteArray?, Exception?) -> Unit) {
        val request = Request.Builder()
            .url(url)
            .get()
            .build()
            
        networkExecutor.execute {
            try {
                okHttpClient.newCall(request).execute().use { response ->
                    if (response.isSuccessful) {
                        val body = response.body
                        if (body != null) {
                            val contentLength = body.contentLength()
                            val inputStream = body.byteStream()
                            val buffer = ByteArray(8192)
                            var totalBytesRead = 0L
                            var bytesRead: Int
                            val outputStream = java.io.ByteArrayOutputStream()
                            
                            while (inputStream.read(buffer).also { bytesRead = it } != -1) {
                                outputStream.write(buffer, 0, bytesRead)
                                totalBytesRead += bytesRead
                                
                                if (contentLength > 0) {
                                    val progress = ((totalBytesRead * 100) / contentLength).toInt()
                                    progressCallback(progress)
                                }
                            }
                            
                            callback(outputStream.toByteArray(), null)
                        } else {
                            callback(null, IOException("Empty response body"))
                        }
                    } else {
                        callback(null, IOException("HTTP ${response.code}: ${response.message}"))
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "Download failed", e)
                callback(null, e)
            }
        }
    }
    
    /**
     * Clean up resources
     */
    fun shutdown() {
        try {
            networkExecutor.shutdown()
            okHttpClient.dispatcher.executorService.shutdown()
        } catch (e: Exception) {
            Log.e(TAG, "Error during shutdown", e)
        }
    }
}
