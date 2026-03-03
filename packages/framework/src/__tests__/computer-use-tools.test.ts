import { describe, it, expect, vi } from 'vitest';
import { defineBashTool, defineTextEditorTool, defineComputerTool } from '../tools/computer-use';

describe('defineBashTool', () => {
  it('returns safe message when no executor configured', async () => {
    const tool = defineBashTool();
    const result = await tool.handler({ command: 'ls' });
    expect(result.content[0].text).toContain('no executor configured');
  });

  it('calls onExecute with the command', async () => {
    const onExecute = vi.fn().mockResolvedValue('file1.txt\nfile2.txt');
    const tool = defineBashTool({ onExecute });
    const result = await tool.handler({ command: 'ls -la' });
    expect(onExecute).toHaveBeenCalledWith('ls -la');
    expect(result.content[0].text).toBe('file1.txt\nfile2.txt');
  });

  it('returns error message when onExecute throws', async () => {
    const tool = defineBashTool({ onExecute: async () => { throw new Error('permission denied'); } });
    const result = await tool.handler({ command: 'rm -rf /' });
    expect(result.content[0].text).toContain('permission denied');
  });

  it('has correct name and schema', () => {
    const tool = defineBashTool();
    expect(tool.name).toBe('bash');
    expect(tool.schema.required).toContain('command');
  });
});

describe('defineTextEditorTool', () => {
  it('returns safe message when no executor configured', async () => {
    const tool = defineTextEditorTool();
    const result = await tool.handler({ command: 'view', path: '/tmp/test.txt' });
    expect(result.content[0].text).toContain('no executor configured');
  });

  it('calls onExecute with all required params', async () => {
    const onExecute = vi.fn().mockResolvedValue('file contents here');
    const tool = defineTextEditorTool({ onExecute });
    const result = await tool.handler({
      command: 'str_replace',
      path: '/tmp/file.txt',
      old_str: 'old',
      new_str: 'new',
    });
    expect(onExecute).toHaveBeenCalledWith(expect.objectContaining({
      command: 'str_replace',
      path: '/tmp/file.txt',
      oldStr: 'old',
      newStr: 'new',
    }));
    expect(result.content[0].text).toBe('file contents here');
  });

  it('has correct tool name', () => {
    const tool = defineTextEditorTool();
    expect(tool.name).toBe('str_replace_based_edit_tool');
  });
});

describe('defineComputerTool', () => {
  it('returns safe message for non-screenshot actions when no executor', async () => {
    const tool = defineComputerTool();
    const result = await tool.handler({ action: 'left_click', coordinate: [100, 200] });
    expect(result.content[0].text).toContain('not configured');
  });

  it('calls onScreenshot for screenshot action', async () => {
    const onScreenshot = vi.fn().mockResolvedValue('base64encodedpng==');
    const tool = defineComputerTool({ onScreenshot });
    const result = await tool.handler({ action: 'screenshot' });
    expect(onScreenshot).toHaveBeenCalled();
    expect(result.content[0].text).toBe('base64encodedpng==');
  });

  it('calls onAction for click/type actions', async () => {
    const onAction = vi.fn().mockResolvedValue(undefined);
    const tool = defineComputerTool({ onAction });
    const result = await tool.handler({ action: 'type', text: 'hello world' });
    expect(onAction).toHaveBeenCalledWith('type', expect.objectContaining({ text: 'hello world' }));
    expect(result.content[0].text).toContain('completed');
  });

  it('uses configured display dimensions', () => {
    const tool = defineComputerTool({ displayWidth: 2560, displayHeight: 1440 });
    expect(tool.description).toContain('2560x1440');
  });

  it('handles onAction errors gracefully', async () => {
    const tool = defineComputerTool({
      onAction: async () => { throw new Error('display error'); },
    });
    const result = await tool.handler({ action: 'left_click', coordinate: [0, 0] });
    expect(result.content[0].text).toContain('display error');
  });
});
