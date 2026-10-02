import type { ContentBlock } from "@/modules/trainings";

/** Toont de inhoudsblokken van een trainingsonderdeel. Nieuwe bloktypes krijgen hier een eigen weergave. */
export function ContentBlocks({ blocks }: { blocks: ContentBlock[] }) {
  return (
    <div className="space-y-4 text-[15px] leading-relaxed text-ink">
      {blocks.map((block, index) => {
        switch (block.type) {
          case "paragraph":
            return <p key={index}>{block.text}</p>;
          case "list": {
            const List = block.ordered ? "ol" : "ul";
            return (
              <List
                key={index}
                className={`space-y-2 pl-5 marker:text-petrol-600 ${block.ordered ? "list-decimal" : "list-disc"}`}
              >
                {block.items.map((item, itemIndex) => (
                  <li key={itemIndex} className="pl-1">
                    {item}
                  </li>
                ))}
              </List>
            );
          }
        }
      })}
    </div>
  );
}
