package expo.modules.wallpwallpaper

import android.app.WallpaperManager
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.Rect
import android.net.Uri
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File
import kotlin.math.max
import kotlin.math.min

class WallpWallpaperModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("WallpWallpaper")
    // Expo dispatches AsyncFunction on its background queue.
    AsyncFunction("apply") { uri: String, target: String ->
      val context = appContext.reactContext ?: throw IllegalStateException("Application context unavailable.")
      val parsed = Uri.parse(uri)
      require(parsed.scheme == "file") { "Only a cached image can be applied." }
      val imageFile = File(parsed.path ?: "").canonicalFile
      require(imageFile.path.startsWith(context.cacheDir.canonicalPath + File.separator) && imageFile.isFile) { "Image must be in the application cache." }
      require(imageFile.length() <= 25L * 1024L * 1024L) { "Image is too large." }
      val flags = when (target) {
        "home" -> WallpaperManager.FLAG_SYSTEM
        "lock" -> WallpaperManager.FLAG_LOCK
        "both" -> WallpaperManager.FLAG_SYSTEM or WallpaperManager.FLAG_LOCK
        else -> throw IllegalArgumentException("Choose home, lock, or both.")
      }
      val manager = WallpaperManager.getInstance(context)
      check(manager.isWallpaperSupported && manager.isSetWallpaperAllowed) { "This device does not allow wallpaper changes." }
      val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
      BitmapFactory.decodeFile(imageFile.path, bounds)
      require(bounds.outWidth > 0 && bounds.outHeight > 0 && bounds.outWidth.toLong() * bounds.outHeight <= 40_000_000L) { "Unsupported image dimensions." }
      var sampling = 1
      while (max(bounds.outWidth, bounds.outHeight) / sampling > 4096) sampling *= 2
      val bitmap = BitmapFactory.decodeFile(imageFile.path, BitmapFactory.Options().apply { inSampleSize = sampling })
        ?: throw IllegalArgumentException("Unable to decode the artwork.")
      val metrics = context.resources.displayMetrics
      val width = metrics.widthPixels.coerceIn(1, 2160)
      val height = metrics.heightPixels.coerceIn(1, 3840)
      val sourceRatio = bitmap.width.toFloat() / bitmap.height
      val targetRatio = width.toFloat() / height
      val cropWidth = if (sourceRatio > targetRatio) (bitmap.height * targetRatio).toInt() else bitmap.width
      val cropHeight = if (sourceRatio < targetRatio) (bitmap.width / targetRatio).toInt() else bitmap.height
      val left = (bitmap.width - cropWidth) / 2
      val top = (bitmap.height - cropHeight) / 2
      val cropped = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
      try {
        Canvas(cropped).drawBitmap(bitmap, Rect(left, top, left + max(1,cropWidth), top + max(1,cropHeight)), Rect(0,0,width,height), Paint(Paint.FILTER_BITMAP_FLAG))
        manager.setBitmap(cropped, null, true, flags)
      } finally {
        cropped.recycle()
        bitmap.recycle()
      }
      true
    }
  }
}
