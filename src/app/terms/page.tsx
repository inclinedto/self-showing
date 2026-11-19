import { type LegalSection, LegalPage } from "@/components/ui/LegalPage";
import { CRISIS_LINES } from "@/lib/community";
import { pageMetadata } from "@/lib/metadata";
import { site } from "@/resources/site";

export const metadata = pageMetadata({
  title: "用户协议",
  description: `${site.name}用户协议`,
  path: "/terms",
});

const contact = site.contactEmail ? `邮件 ${site.contactEmail}` : "本站提问箱";

const sections: LegalSection[] = [
  {
    title: "服务说明",
    paragraphs: [
      `${site.name}是由${site.owner}个人运营的网站，提供表格提取、文档问答、AI 小助手、格式转换等工具，以及匿名树洞和提问箱。`,
      "注册即表示你已阅读并同意本协议。如果不同意，请停止使用本站。",
    ],
  },
  {
    title: "账号",
    paragraphs: [
      "你需要使用用户名和密码注册账号，并妥善保管密码。通过你的账号进行的操作视为你本人的行为。",
      "禁止批量注册、出租、出售或共享账号，禁止通过脚本等方式绕过额度限制。违反的账号可能被停用。",
    ],
  },
  {
    title: "使用规范",
    paragraphs: [
      "请遵守中华人民共和国法律法规和公序良俗。不得发布或通过 AI 工具生成以下内容：违法违规、色情低俗、赌博诈骗、暴力恐怖、侵犯他人隐私或知识产权、人身攻击、谣言、广告引流等。",
      "为了保护隐私和防止广告，树洞和提问箱里不能留下手机号、微信、QQ、链接等联系方式。",
      "不得攻击、扫描、大量抓取本站，不得干扰本站正常运行。",
    ],
  },
  {
    title: "匿名社区",
    paragraphs: [
      "树洞和提问箱以随机昵称展示，其他用户看不到你的用户名。匿名不代表不用负责，请友善发言。",
      "被多名用户举报的内容会被自动隐藏，等待站长审核。站长有权删除违规内容，并视情节停用账号。",
      `树洞不能替代专业的心理咨询。如果你正处在危机中，请拨打${CRISIS_LINES.map((line) => `${line.name} ${line.phone}`).join("、")}，紧急情况请拨打 110 或 120。`,
    ],
  },
  {
    title: "AI 生成内容",
    paragraphs: [
      "AI 工具的结果由第三方大模型生成，可能存在错误或遗漏，仅供参考，不构成医疗、法律、财务等专业意见。请在使用前自行核对，尤其是表格中的关键数字。",
      "请只上传你有权处理的文件，不要上传涉密或含有他人敏感个人信息的材料。",
    ],
  },
  {
    title: "会员与付费",
    paragraphs: [
      "免费用户每天可以使用一定额度，会员可以获得更高的每日额度。具体额度以会员页面展示为准，额度每天北京时间零点重置。",
      "会员通过爱发电在线支付或兑换码开通，到期后自动恢复为免费版。续费会在原到期时间上顺延。",
      "会员属于虚拟服务，开通后原则上不支持退款。如遇重复扣款、付款后未开通或长期无法使用，请联系站长处理。",
      "如果额度规则需要调整，会提前在网站上公告，不会影响你已购买会员的剩余天数。",
    ],
  },
  {
    title: "服务变更与免责",
    paragraphs: [
      "本站由个人运营，会尽力保持服务稳定，但不保证服务不中断、不出错。因第三方服务（托管平台、AI 服务商、支付平台）故障导致的问题，会尽快协调处理。",
      "如果本站需要停止运营，会至少提前 30 天公告，并对仍在有效期内的会员按剩余天数协商处理。",
    ],
  },
  {
    title: "联系方式",
    paragraphs: [`对本协议或本站有任何问题，可以通过${contact}联系站长。`],
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      title="用户协议"
      updated="2026 年 11 月 19 日"
      intro={`欢迎使用${site.name}。为了让大家都能安心使用，请在注册和使用前阅读以下条款。`}
      sections={sections}
    />
  );
}
