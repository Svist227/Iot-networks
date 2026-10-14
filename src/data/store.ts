import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { initialProjects, makeProject, uid } from './model';
import type { Profile, Project, Report, Run, Scenario } from './model';

type Store = {
  projects: Project[];
  activeProjectId: string;
  runs: Run[];
  reports: Report[];
  profile: Profile;
  storageError: boolean;
  selectProject: (id: string) => void;
  addProject: (name: string, template: string) => string;
  updateProject: (id: string, patch: Partial<Project>) => void;
  saveScenario: (projectId: string, scenario: Scenario) => void;
  saveRun: (run: Run) => void;
  createReport: (runId: string) => string;
  updateProfile: (profile: Profile) => void;
};
const seed = initialProjects();
// Replace this storage adapter and the actions with an API repository when the backend is ready.
const storage = createJSONStorage(() => ({
  getItem: (name: string) => {
    try {
      return localStorage.getItem(name);
    } catch {
      queueMicrotask(() => useStore.setState({ storageError: true }));
      return null;
    }
  },
  setItem: (name: string, value: string) => {
    try {
      localStorage.setItem(name, value);
    } catch {
      queueMicrotask(() => {
        if (!useStore.getState().storageError) useStore.setState({ storageError: true });
      });
    }
  },
  removeItem: (name: string) => localStorage.removeItem(name),
}));
export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      projects: seed,
      activeProjectId: seed[0].id,
      runs: [],
      reports: [],
      storageError: false,
      profile: {
        firstName: 'Роман',
        lastName: 'Данилов',
        email: 'user@example.com',
        role: 'Frontend-разработка',
        bio: 'Разрабатываю интерфейсы и исследую моделирование IoT-сетей.',
        completionNotice: true,
      },
      selectProject: (id) => set({ activeProjectId: id }),
      addProject: (name, template) => {
        const project = makeProject(name.trim(), template);
        set((s) => ({ projects: [...s.projects, project], activeProjectId: project.id }));
        return project.id;
      },
      updateProject: (id, patch) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === id ? { ...p, ...patch, updatedAt: new Date().toISOString() } : p,
          ),
        })),
      saveScenario: (projectId, scenario) => {
        const p = get().projects.find((p) => p.id === projectId);
        if (!p) return;
        get().updateProject(projectId, {
          scenarios: p.scenarios.some((s) => s.id === scenario.id)
            ? p.scenarios.map((s) => (s.id === scenario.id ? scenario : s))
            : [...p.scenarios, scenario],
          selectedScenarioId: scenario.id,
        });
      },
      saveRun: (run) =>
        set((s) => ({ runs: s.runs.some((r) => r.id === run.id) ? s.runs : [run, ...s.runs] })),
      createReport: (runId) => {
        const run = get().runs.find((r) => r.id === runId);
        if (!run) throw new Error('Сначала запустите сценарий.');
        const report = {
          id: uid(),
          runId,
          name: run.scenario.name,
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ reports: [report, ...s.reports] }));
        return report.id;
      },
      updateProfile: (profile) => set({ profile }),
    }),
    {
      name: 'setreserve-workspace-v1',
      version: 1,
      storage,
      partialize: ({ storageError: _, ...state }) => state,
      onRehydrateStorage: () => (_state, error) => {
        if (error) queueMicrotask(() => useStore.setState({ storageError: true }));
      },
    },
  ),
);
export const useProject = () =>
  useStore((s) => s.projects.find((p) => p.id === s.activeProjectId) ?? s.projects[0]);
