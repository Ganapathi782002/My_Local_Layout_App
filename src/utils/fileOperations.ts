import html2canvas from 'html2canvas';
import { CanvasConfig } from '../types';

/**
 * Exports the content of an HTML element (your canvas container) as a PNG image.
 * @param element The HTML element to capture.
 * @param backgroundColor The background color to use for the canvas capture.
 * @param dispatch The dispatch function from useReducer to mark changes as saved.
 */
export const exportCanvasAsPNG = async (
  element: HTMLElement,
  backgroundColor: string,
  dispatch: React.Dispatch<any>
) => {
  try {
    const canvas = await html2canvas(element, {
      backgroundColor: backgroundColor,
      scale: 2,
      logging: false,
      useCORS: true,
    });

    const link = document.createElement('a');
    link.download = 'panel-drawing.png';
    link.href = canvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);

    dispatch({ type: 'MARK_AS_SAVED' });
  } catch (error) {
    console.error('Error exporting canvas to PNG:', error);
    alert('Failed to export image. Please try again.');
  }
};

/**
 * Exports the current CanvasConfig state as a JSON file.
 * @param config The CanvasConfig object to export.
 * @param dispatch The dispatch function from useReducer to mark changes as saved.
 */
export const exportCanvasConfigAsJSON = (
  config: CanvasConfig,
  dispatch: React.Dispatch<any>
) => {
  try {
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'panel-layout.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    dispatch({ type: 'MARK_AS_SAVED' });
  } catch (error) {
    console.error('Error exporting configuration:', error);
    alert('Failed to export configuration. Please try again.');
  }
};

/**
 * Imports a CanvasConfig from a selected JSON file.
 * @param file The File object representing the selected JSON.
 * @param dispatch The dispatch function from useReducer to load the configuration.
 */
export const importCanvasConfig = (
  file: File | undefined,
  dispatch: React.Dispatch<any>
) => {
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const importedConfig: CanvasConfig = JSON.parse(e.target?.result as string);
      importedConfig.panels = importedConfig.panels.map(p => ({ ...p, text: p.text || '' }));
      importedConfig.theme = importedConfig.theme || 'light';

      dispatch({ type: 'LOAD_CONFIG', payload: importedConfig });
    } catch (error) {
      console.error('Error importing configuration:', error);
      alert('Error importing configuration. Please check the file format and ensure it\'s a valid layout JSON.');
    }
  };
  reader.readAsText(file);
};