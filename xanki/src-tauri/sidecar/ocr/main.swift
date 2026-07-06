import Foundation
import Vision
import AppKit

struct OcrWord: Codable {
    let id: Int
    let text: String
    let x: Double
    let y: Double
    let w: Double
    let h: Double
}

struct OcrResult: Codable {
    let words: [OcrWord]
    let fullText: String

    enum CodingKeys: String, CodingKey {
        case words
        case fullText
    }
}

guard CommandLine.arguments.count > 1 else {
    fputs("usage: xanki-ocr <image-path>\n", stderr)
    exit(1)
}

let imagePath = CommandLine.arguments[1]
let url = URL(fileURLWithPath: imagePath)

guard let nsImage = NSImage(contentsOf: url),
      let tiff = nsImage.tiffRepresentation,
      let bitmap = NSBitmapImageRep(data: tiff),
      let cgImage = bitmap.cgImage else {
    fputs("failed to load image\n", stderr)
    exit(2)
}

let request = VNRecognizeTextRequest()
request.recognitionLevel = .accurate
request.recognitionLanguages = ["ja-JP", "en-US"]
request.usesLanguageCorrection = true

let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
do {
    try handler.perform([request])
} catch {
    fputs("vision failed: \(error)\n", stderr)
    exit(3)
}

var words: [OcrWord] = []
var fullParts: [String] = []
var wordId = 0

if let observations = request.results {
    for observation in observations {
        guard let candidate = observation.topCandidates(1).first else { continue }
        let box = observation.boundingBox
        let width = Double(cgImage.width)
        let height = Double(cgImage.height)
        let x = box.origin.x * width
        let y = (1.0 - box.origin.y - box.size.height) * height
        let w = box.size.width * width
        let h = box.size.height * height
        let text = candidate.string.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else { continue }
        words.append(OcrWord(id: wordId, text: text, x: x, y: y, w: w, h: h))
        fullParts.append(text)
        wordId += 1
    }
}

let result = OcrResult(words: words, fullText: fullParts.joined(separator: " "))
let encoder = JSONEncoder()
encoder.outputFormatting = [.sortedKeys]
if let data = try? encoder.encode(result),
   let json = String(data: data, encoding: .utf8) {
    print(json)
    exit(0)
}

fputs("failed to encode result\n", stderr)
exit(4)
