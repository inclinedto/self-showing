import { Column, Heading, Text } from "@once-ui-system/core";

export type LegalSection = { title: string; paragraphs: string[] };

export function LegalPage({ title, updated, intro, sections }: { title: string; updated: string; intro: string; sections: LegalSection[] }) {
  return (
    <Column as="article" fillWidth maxWidth={44} gap="24" paddingY="16" style={{ margin: "0 auto" }}>
      <Column gap="8">
        <Heading as="h1" variant="heading-strong-xl">
          {title}
        </Heading>
        <Text variant="body-default-s" onBackground="neutral-weak">
          最近更新：{updated}
        </Text>
      </Column>
      <Text variant="body-default-m" onBackground="neutral-medium" style={{ lineHeight: 1.8 }}>
        {intro}
      </Text>
      {sections.map((section, index) => (
        <Column as="section" key={section.title} gap="8">
          <Heading as="h2" variant="heading-strong-s">
            {index + 1}. {section.title}
          </Heading>
          {section.paragraphs.map((paragraph) => (
            <Text key={paragraph} as="p" variant="body-default-m" onBackground="neutral-medium" style={{ lineHeight: 1.8, margin: 0 }}>
              {paragraph}
            </Text>
          ))}
        </Column>
      ))}
    </Column>
  );
}
