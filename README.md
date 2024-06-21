# Harmonic Lightscape

Harmonic Lightscape is an interactive visualizer that combines sound, geometry, and light to create mesmerizing patterns and effects. The visualizer responds to audio input, transforming it into stunning geometric shapes and colorful light displays.

## Features

- **Shape Selection**: Choose from various geometric shapes such as circles, toruses, squares, flowers of life, Metatron's cubes, interlapping circles, and spirals.
- **Color Modes**: Select between Chakra colors and an infinite spectrum rainbow to color the shapes.
- **Echo Effect**: Adjust the echo effect to control the persistence of shapes on the screen.
- **Falling Effect**: Toggle the falling effect to create the illusion of continuously falling into the center of the shapes.
- **Webcam Colors**: Use the colors captured from your webcam to color the lines in the visualizer.

## Getting Started

### Prerequisites

- A modern web browser that supports WebRTC and Web Audio API.
- Access to your computer's microphone and webcam.

### Installation

1. Clone the repository or download the project files.
2. Open the `index.html` file in your web browser.

### Usage

1. Allow the browser to access your microphone and webcam when prompted.
2. Use the controls to customize the visualizer:
   - **Select Shape**: Choose the geometric shape to be displayed.
   - **Color Mode**: Select the color mode for the shapes.
   - **Echo Effect**: Adjust the slider to set the echo effect.
   - **Falling Effect**: Toggle the checkbox to enable or disable the falling effect.
   - **Webcam Colors**: Toggle the checkbox to use webcam colors for the shapes.

### URL Parameters

You can configure the visualizer using URL parameters:

- `shape`: Set the shape (e.g., `circle`, `torus`, `square`, `flowerOfLife`, `metatronsCube`, `drawInterlappingCircles`, `spiral`).
- `colorMode`: Set the color mode (`chakra`, `rainbow`).
- `echoEffect`: Set the echo effect (e.g., `0.5`).
- `fallingEffect`: Enable or disable the falling effect (`true`, `false`).

Example:
`URL: https://placeholderdomain.co.nz/?shape=metatronsCube&colorMode=rainbow&echoEffect=0.5&fallingEffect=true`

## Technical Details
- **HTML**: Structure and layout of the website.
- **CSS**: Styling for the visual elements and controls.
- **JavaScript**: Core functionality, including audio processing, shape generation, and webcam integration.

## Future Enhancements

- Add more geometric shapes and color modes.
- Improve performance and responsiveness.
- Enhance user interface with more interactive controls and visual feedback.

## Contributing

Contributions are welcome! Feel free to submit a pull request or open an issue to discuss improvements and new features.
Delays are likely, as is this is a hobby project

## Acknowledgments

- Inspired by the beauty of sound, geometry, and light.
- Thanks to the developers of WebRTC and Web Audio API for providing the necessary tools to create this visualizer.
