import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { UI_TEXT } from "../i18n";
import { HelpPage } from "./HelpPage";

describe("HelpPage", () => {
  it("renders a concise Chinese guide with the important behavior boundaries", () => {
    const markup = renderToStaticMarkup(createElement(HelpPage, {
      open: true,
      text: UI_TEXT.zh.help,
      onClose: vi.fn(),
    }));

    expect(markup).toContain("制作并保留你的卡牌");
    expect(markup).toContain("推荐流程");
    expect(markup).toContain("载入可编辑模板");
    expect(markup).toContain("项目文件");
    expect(markup).toContain("不保存嵌入卡图");
    expect(markup).toContain("本地卡库文件夹将无法打开");
    expect(markup).toContain("卡库为只读状态");
    expect(markup).toContain("本地文件与隐私");
    expect(markup).toContain("向 Vercel Speed Insights 发送页面性能指标");
    expect(markup).toContain("不包含卡牌内容或本地文件");
    expect(markup).toContain("关闭帮助并返回编辑器");
    expect(markup).not.toContain("←");
    expect(markup).not.toContain('hidden=""');
  });

  it("keeps the English guide mounted but hidden when the editor is visible", () => {
    const markup = renderToStaticMarkup(createElement(HelpPage, {
      open: false,
      text: UI_TEXT.en.help,
      onClose: vi.fn(),
    }));

    expect(markup).toContain("Create and keep your card");
    expect(markup).toContain("Selecting a reference card changes only the comparison card");
    expect(markup).toContain("Load editable template replaces the current card");
    expect(markup).toContain("sends page-performance metrics to Vercel Speed Insights");
    expect(markup).toContain("do not include card content or local files");
    expect(markup).toContain('hidden=""');
  });
});
