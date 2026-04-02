
Sub GEP_Expedicao1()

'Tip:
' 1. Use the <CTRL+SPACE> or <CTRL+I> shortcut to open a list of all objects and functions
' 2. Write the code using the HMI Runtime object.
'  Example: HmiRuntime.Screens("Screen_1").
' 3. Use the <CTRL+J> shortcut to create an object reference.
'Write the code as of this position:

Dim DataTime
Dim folder_y_m, folder_day, EX1, filepath, var, header,filepath_C 
Dim fso, fso1, fso2, fso3  
Dim H, Min, S, d, Mon, Y
Dim val10,val11,val12,val13,val14,val15,val16,val17,val18,val19,val20,val21,val22,val23,val24,val25,val26
Dim val(26)
Dim i 

val(10)= SmartTags("Pos_P1A03") 'Sinaliza acoplado tromba 2 - GEP (1 - Acoplado e 2 - Desacoplado)
val(11)= SmartTags("P1P02.Sts_Corrente") 'Leitura corrente em porcentagem da eclusa filtro despoeiramento silo cimento 1
val(12)= SmartTags("P1P02.Sts_Corrente_Perc") 'Leitura corrente em amperes da eclusa filtro despoeiramento silo cimento 1
val(13)= SmartTags("P1P03.Sts.current") 'Leitura corrente em porcentagem do ventilador filtro despoeiramento silo cim. 1
val(14)= SmartTags("P1P03.Sts.currentPerc") 'Leitura corrente em amperes do ventilador filtro despoeiramento silo cimento 1
val(15)= SmartTags("P2P03.Sts.current") 'Leitura corrente em porcentagem do ventilador filtro despoeiramento silo cim. 2
val(16)= SmartTags("P2P03.Sts.currentPerc") 'Leitura corrente em amperes do ventilador filtro despoeiramento silo cimento 2
val(17)= SmartTags("P3P03.Sts_Corrente") 'Leitura corrente em porcentagem do ventilador filtro despoeiramento silo cim. 3
val(18)= SmartTags("P3P03.Sts_Corrente_Perc")  'Leitura corrente em amperes do ventilador filtro despoeiramento silo cimento 3
val(19)= 0  'Leitura corrente em porcentagem soprador de fluidização do silo cimento 1
val(20)= 0  'Leitura corrente em amperes soprador de fluidização do silo cimento 1
val(21)= 0 'Leitura corrente em porcentagem soprador de fluidização do silo cimento 3
val(22)= 0  'Leitura corrente em amperes soprador de fluidização do silo cimento 3
val(23)= SmartTags("P1J01.Sts.currentPerc")  'Leitura corrente em amperes soprador de fluidização do silo cimento 3
val(24)= SmartTags("P1J01.Sts.currentPerc")  'Leitura corrente em amperes soprador de fluidização do silo cimento 3
val(25)= SmartTags("P3J01.Sts.currentPerc")  'Leitura corrente em amperes soprador de fluidização do silo cimento 3
val(26)= SmartTags("P3J01.Sts.currentPerc")  'Leitura corrente em amperes soprador de fluidização do silo cimento 3

'Formarta e aredunda os valores 
For i = 10 To 26
	
        If i < 27 Then
     val(i) =   FormatNumber(val(i),2,True,False,False)
       
           End If 
Next 


Mon = Right("00" & Month (Now()),2)
Y = Year(Date())
d = Right("00" & Day (Now()),2)
H = Right("00"& Hour(Time()),2)
Min = Right("00"& Minute(Time()),2)
S = Second(Time())
 
DataTime= d & Mon & Y

EX1 = DataTime & ".EX1"
'Create Folder year_month
'Set fso = CreateObject("Scripting.FileSystemObject")
'folder_y_m = "Z:\RELATORIOS\" & Y & "_" & Mon
'If Not fso.FolderExists(folder_y_m) Then
' fso.CreateFolder (folder_y_m)
'End If
'Create Folder day
'Set fso1 = CreateObject("Scripting.FileSystemObject")
'folder_day = folder_y_m & "\" & d
'If Not fso1.FolderExists(folder_day) Then
' fso1.CreateFolder (folder_day)
'End If
'Create File Excel


Set fso2 = CreateObject("Scripting.FileSystemObject")
filepath_C = "C:\\Relatorios" & folder_day & "\" & EX1

'Salva no pasta c:\\Relatorios
If Not fso2.FileExists(filepath_C) Then
 fso2.CreateTextFile(filepath_C)
 'Create Header Text
 Set var=CreateObject("Scripting.FileSystemObject")
 Set header=var.OpenTextFile(filepath_C,8)
 header.Close
End If
'Write Data from Tag'
Set fso3 = fso2.OpenTextFile (filepath_C,8,1)
fso3.WriteLine Y & Mon & d & H & Min &  ";" & val(10) & ";" & val(11) & ";" & val(12) & ";" & val(13) & ";" & val(14) & ";" & val(15) & ";" & val(16) & ";" & val(17) & ";" & val(18) & ";" & val(19) & ";" & val(20) & ";" & val(21) & ";" & val(22) & ";" & val(23) & ";" & val(24) & ";" & val(25) & ";" & val(26) 
fso3.Close

'Salva no pasta z:\\
filepath = "Z:\\" & folder_day & "\" & EX1
If Not fso2.FileExists(filepath) Then
 fso2.CreateTextFile(filepath)
 'Create Header Text
 Set var=CreateObject("Scripting.FileSystemObject")
 Set header=var.OpenTextFile(filepath,8)
 header.Close
End If
'Write Data from Tag'
Set fso3 = fso2.OpenTextFile (filepath,8,1)
fso3.WriteLine Y & Mon & d & H & Min &  ";" & val(10) & ";" & val(11) & ";" & val(12) & ";" & val(13) & ";" & val(14) & ";" & val(15) & ";" & val(16) & ";" & val(17) & ";" & val(18) & ";" & val(19) & ";" & val(20) & ";" & val(21) & ";" & val(22) & ";" & val(23) & ";" & val(24) & ";" & val(25) & ";" & val(26) 
fso3.Close


End Sub