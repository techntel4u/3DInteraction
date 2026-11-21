On-device speech recognition for "At the doctor's", used only on browsers without
built-in speech recognition (for example Chrome, Edge and Firefox on iPhone and iPad).

- Model: OpenAI Whisper tiny.en (MIT licence), ONNX export by k2-fsa/sherpa-onnx (Apache 2.0),
  re-quantised to int8 (encoder ~11 MB, decoder ~30 MB).
- Runtime: onnxruntime-web 1.22.0 (MIT), in /vendor/ort.
- Audio never leaves the device. Files are downloaded the first time they are needed and kept
  in the browser cache ("esol-stt-v1").
