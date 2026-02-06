# Card System Documentation

## Philosophy

**ONE card shell. Content is composition.**

The `TerminalCard` is a single, consistent container. You control:

- **tone** - border color (neutral, primary, success, warning, danger)
- **interactive** - hover states
- **header.icon** - optional icon on right
- **header.meta** - optional metadata (e.g., "8 items")
- **content** - anything you want inside

## Quick Start

```tsx
import {
  TerminalCard,
  TerminalCardHeader,
  TerminalCardContent,
  TerminalCardFooter,
  TerminalStat,
  TerminalStatGroup,
} from '@/components/ui/card';

<TerminalCard>
  <TerminalCardHeader code="0x00" title="MODULE" icon={<Icon />} />
  <TerminalCardContent>Any content here</TerminalCardContent>
</TerminalCard>;
```

## Props Reference

### TerminalCard

| Prop          | Type                                                           | Default     | Description         |
| ------------- | -------------------------------------------------------------- | ----------- | ------------------- |
| `tone`        | `"neutral" \| "primary" \| "success" \| "warning" \| "danger"` | `"neutral"` | Border color        |
| `interactive` | `boolean`                                                      | `false`     | Enable hover states |
| `as`          | `"div" \| "article" \| "section"`                              | `"div"`     | HTML element        |

### TerminalCardHeader

| Prop    | Type        | Default     | Description                |
| ------- | ----------- | ----------- | -------------------------- |
| `code`  | `string`    | `"0x00"`    | Hex code in brackets       |
| `title` | `string`    | required    | Header title               |
| `icon`  | `ReactNode` | `undefined` | Icon on right              |
| `meta`  | `ReactNode` | `undefined` | Metadata (e.g., "8 items") |

### TerminalCardContent

| Prop      | Type                   | Default | Description     |
| --------- | ---------------------- | ------- | --------------- |
| `padding` | `"sm" \| "md" \| "lg"` | `"md"`  | Content padding |

### TerminalStat / TerminalStatGroup

```tsx
<TerminalStatGroup>
  <TerminalStat label="Speed" value="OPTIMIZED" />
  <TerminalStat label="Status" value="ACTIVE" size="sm" />
</TerminalStatGroup>
```

| Prop    | Type               | Default  | Description           |
| ------- | ------------------ | -------- | --------------------- |
| `label` | `string`           | required | Label (muted color)   |
| `value` | `string \| number` | required | Value (primary color) |
| `size`  | `"sm" \| "md"`     | `"md"`   | Text size             |

## Examples

### Interactive Grid Card

```tsx
<TerminalCard interactive>
  <TerminalCardHeader
    code="0x00"
    title="MODULE"
    icon={
      <Icon className="text-muted-foreground group-hover:text-primary size-4 transition-colors" />
    }
  />
  <TerminalCardContent>
    <div className="text-foreground mb-3 text-xs font-semibold">MODULE_NAME</div>
    <div className="text-xs">
      <span className="text-muted-foreground">DESC: </span>
      <span className="text-foreground">Description here</span>
    </div>
  </TerminalCardContent>
</TerminalCard>
```

### Feature List

```tsx
<TerminalCard>
  <TerminalCardHeader code="0x00" title="FEATURES" meta="4 items" />
  <TerminalCardContent>
    <ul className="space-y-2">
      {features.map((feature, i, arr) => (
        <li key={i} className="flex items-start gap-4 text-xs">
          <span className="text-primary">{i === arr.length - 1 ? '└─' : '├─'}</span>
          <span className="text-foreground">{feature}</span>
        </li>
      ))}
    </ul>
  </TerminalCardContent>
</TerminalCard>
```

### With Footer Actions

```tsx
<TerminalCard tone="warning">
  <TerminalCardHeader code="0x00" title="NOTICE" icon={<AlertTriangle />} />
  <TerminalCardContent>Content here</TerminalCardContent>
  <TerminalCardFooter>
    <Button size="sm">&gt; ACKNOWLEDGE</Button>
  </TerminalCardFooter>
</TerminalCard>
```

## Visual Showcase

See all examples at `/component-showcase/cards`
