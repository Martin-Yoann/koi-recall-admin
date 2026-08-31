import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "input-interactive h-9 w-full min-w-0 px-3 py-1.5 text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Input }
