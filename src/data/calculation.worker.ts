import { makeRun, type Project, type Scenario } from './model';

self.onmessage = ({ data }: MessageEvent<{ project: Project; scenario: Scenario }>) => {
  try {
    self.postMessage({ run: makeRun(data.project, data.scenario) });
  } catch (error) {
    self.postMessage({
      error: error instanceof Error ? error.message : 'Не удалось выполнить расчёт.',
    });
  }
};
