// Raster export of scorecard-mark.svg for Apple's opaque 1024px icon slot.
import AppKit
import Foundation
let size = 1024
let canvas = CGContext(data: nil, width: size, height: size, bitsPerComponent: 8,
  bytesPerRow: size * 4, space: CGColorSpaceCreateDeviceRGB(),
  bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue)!
let context = NSGraphicsContext(cgContext: canvas, flipped: false)
NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = context
func color(_ hex: UInt32) -> NSColor { NSColor(calibratedRed: CGFloat((hex >> 16) & 255) / 255, green: CGFloat((hex >> 8) & 255) / 255, blue: CGFloat(hex & 255) / 255, alpha: 1) }
func fill(_ rect: NSRect, _ hex: UInt32) { color(hex).setFill(); NSBezierPath(rect: rect).fill() }
func line(_ x1: CGFloat, _ y1: CGFloat, _ x2: CGFloat, _ y2: CGFloat, _ width: CGFloat, _ hex: UInt32) {
  color(hex).setStroke(); let p = NSBezierPath(); p.lineWidth = width; p.move(to: NSPoint(x: x1, y: y1)); p.line(to: NSPoint(x: x2, y: y2)); p.stroke()
}
fill(NSRect(x: 0, y: 0, width: 1024, height: 1024), 0x191B19)
fill(NSRect(x: 176, y: 176, width: 672, height: 672), 0x222520)
color(0x666B5E).setStroke(); let court = NSBezierPath(rect: NSRect(x: 176, y: 176, width: 672, height: 672)); court.lineWidth = 8; court.stroke()
line(176, 512, 848, 512, 6, 0x51564B)
let circle = NSBezierPath(ovalIn: NSRect(x: 400, y: 400, width: 224, height: 224)); circle.lineWidth = 6; color(0x666B5E).setStroke(); circle.stroke()
line(416, 792, 608, 792, 24, 0xB9BDAF)
line(232, 416, 232, 608, 24, 0xB9BDAF)
line(792, 416, 792, 608, 24, 0xB9BDAF)
line(416, 232, 608, 232, 24, 0xD0AF66)
color(0xEEE7D8).setFill(); NSBezierPath(ovalIn: NSRect(x: 596, y: 564, width: 56, height: 56)).fill()
NSGraphicsContext.restoreGraphicsState()
let destination = URL(fileURLWithPath: CommandLine.arguments[1])
let bitmap = NSBitmapImageRep(cgImage: canvas.makeImage()!)
try bitmap.representation(using: .png, properties: [:])!.write(to: destination)
